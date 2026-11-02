/// <reference types="@cloudflare/vitest-plugin/types" />
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { SELF, applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

const origin = "https://quiz.example.test";
const email = "recovery@example.test";
const setupCode = "runtime-only-private-recovery-code-never-use-in-production";
const oldPassword = "Previous-test-password-42!";
const newPassword = "Fresh-test-password-2026!";
let cookie = "";
let emails: { to: string[]; text: string; from: string }[];
let deliveryStatus = 200;
async function post(
  path: string,
  body: unknown,
  extra: Record<string, string> = {},
) {
  return SELF.fetch(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: {
        origin,
        "Content-Type": "application/json",
        "cf-connecting-ip": "192.0.2.15",
        ...extra,
      },
      body: JSON.stringify(body),
    }),
  );
}
async function session() {
  return SELF.fetch(
    new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }),
  );
}
function link(index = 0) {
  return emails[index].text.match(/https:\/\/[^\s]+/)![0];
}
async function token(index = 0) {
  return new URL(link(index)).searchParams.get("token")!;
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
beforeEach(async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    if (String(input) !== "https://api.resend.com/emails")
      throw new Error("Unexpected outbound request");
    emails.push(JSON.parse(String(init?.body)));
    return Response.json({ id: "fake-mail-id" }, { status: deliveryStatus });
  });
  emails = [];
  deliveryStatus = 200;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM user WHERE email = ?").bind(email),
    env.DB.prepare("DELETE FROM verification"),
    env.DB.prepare("DELETE FROM rate_limit"),
  ]);
  const signedUp = await post(
    "/sign-up/email",
    { name: "Recovery Teacher", email, password: oldPassword },
    { "x-teacher-setup-code": setupCode },
  );
  expect(signedUp.status).toBe(200);
  cookie = signedUp.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
});
afterEach(() => vi.restoreAllMocks());

test("setup-code reset rejects invalid proof, weak passwords and other origins, then revokes existing sessions", async () => {
  const body = { email, setupCode, newPassword };
  expect(
    (await post("/reset-with-setup-code", { ...body, setupCode: "123456" }))
      .status,
  ).toBe(400);
  expect(
    (
      await post("/reset-with-setup-code", {
        ...body,
        email: "outsider@example.test",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await post("/reset-with-setup-code", body, {
        origin: "https://outsider.example",
      })
    ).status,
  ).toBe(403);
  expect(
    (await post("/reset-with-setup-code", { ...body, newPassword: "short" }))
      .status,
  ).toBe(400);
  expect((await post("/reset-with-setup-code", body)).status).toBe(200);
  expect(await (await session()).json()).toBeNull();

  expect(
    (await post("/sign-in/email", { email, password: newPassword })).status,
  ).toBe(200);
  const stored = await env.DB.prepare(
    "SELECT password FROM account WHERE provider_id = 'credential'",
  ).first<{ password: string }>();
  expect(stored?.password).not.toBe(newPassword);
});

test("email reset uses the configured origin, sends only to the teacher, and invalidates all reset links after use", async () => {
  expect(
    (
      await post("/request-teacher-password-reset", {
        email,
      })
    ).status,
  ).toBe(200);
  expect(emails[0].to).toEqual([email]);
  expect(new URL(link()).origin).toBe(origin);
  expect(new URL(link()).pathname).toBe("/reset-password");
  expect(emails[0].text).not.toContain(setupCode);
  const first = await token();
  await post("/request-teacher-password-reset", { email });
  const second = await token(1);
  expect(
    (await post("/reset-password", { token: first, newPassword })).status,
  ).toBe(200);
  expect(await (await session()).json()).toBeNull();
  const remaining = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM verification WHERE identifier LIKE 'reset-password:%'",
  ).first<{ count: number }>();
  expect(remaining?.count).toBe(0);
  expect(first).not.toBe(second);
  expect(
    (
      await post("/request-teacher-password-reset", {
        email: "unknown@example.test",
      })
    ).status,
  ).toBe(200);
  expect(emails).toHaveLength(2);
  expect(
    (await post("/request-teacher-password-reset", { email })).status,
  ).toBe(429);
  expect(
    (await post("/sign-in/email", { email, password: newPassword })).status,
  ).toBe(200);
});

test("email delivery failures are reported without claiming a reset email was sent", async () => {
  deliveryStatus = 503;
  expect(
    (await post("/request-teacher-password-reset", { email })).status,
  ).toBe(503);
});

test("repeated incorrect setup codes are rate limited", async () => {
  for (let index = 0; index < 5; index++)
    expect(
      (
        await post("/reset-with-setup-code", {
          email,
          setupCode: "incorrect",
          newPassword,
        })
      ).status,
    ).toBe(400);
  expect(
    (await post("/reset-with-setup-code", { email, setupCode, newPassword }))
      .status,
  ).toBe(429);
});

test("setup recovery can add a password to an existing Google-only teacher account", async () => {
  await env.DB.prepare(
    "DELETE FROM account WHERE provider_id = 'credential'",
  ).run();
  expect(
    (await post("/reset-with-setup-code", { email, setupCode, newPassword }))
      .status,
  ).toBe(200);
  expect(
    (await post("/sign-in/email", { email, password: newPassword })).status,
  ).toBe(200);
});
