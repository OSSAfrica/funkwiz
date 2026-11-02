/// <reference types="@cloudflare/vitest-plugin/types" />
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import {
  sendAccountNotification,
  sendResetEmail,
} from "../src/lib/auth-email.server";
import {
  emailDeliveryOptions,
  selectedEmailProvider,
} from "../src/lib/email-settings.server";
import type { AuthSettings } from "../src/lib/auth-policy";
const smtp = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn() }));
const makeTransport = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({ createTransport: makeTransport }));
const email = "delivery@example.test",
  url = "https://quiz.example.test/reset-password?token=fake-only-token";
const base: AuthSettings = {
  BETTER_AUTH_URL: "https://quiz.example.test",
  TEACHER_EMAIL: email,
  AUTH_EMAIL_FROM: "quiz@example.test",
};
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
beforeEach(() => {
  makeTransport.mockReturnValue(smtp);
  smtp.sendMail.mockResolvedValue({ accepted: [email], rejected: [] });
});
afterEach(() => {
  vi.restoreAllMocks();
  makeTransport.mockClear();
  smtp.sendMail.mockReset();
  smtp.close.mockClear();
});

test("Cloudflare uses the native structured email binding with text and HTML", async () => {
  const send = vi.fn(async () => ({ messageId: "fake-native-id" }));
  await sendResetEmail(
    { ...base, EMAIL: { send } },
    email,
    url,
    "fake-token",
    "cloudflare",
  );
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      from: base.AUTH_EMAIL_FROM,
      to: [email],
      subject: "Reset your Funkwiz password",
      text: expect.stringContaining(url),
      html: expect.stringContaining("Reset my password"),
    }),
  );
});
test("Cloudflare binding rejection is reported as a delivery failure", async () => {
  const send = vi.fn(async () => {
    throw new Error("fake rejection");
  });
  await expect(
    sendResetEmail(
      { ...base, EMAIL: { send } },
      email,
      url,
      "fake-token",
      "cloudflare",
    ),
  ).rejects.toMatchObject({ statusCode: 503 });
});
test("SMTP sends through Nodemailer with authenticated TLS and closes its transport", async () => {
  await sendResetEmail(
    {
      ...base,
      SMTP_HOST: "smtp.example.test",
      SMTP_USER: "mailer",
      SMTP_PASSWORD: "fake-smtp-password",
    },
    email,
    url,
    "fake-token",
    "smtp",
  );
  expect(makeTransport).toHaveBeenCalledWith(
    expect.objectContaining({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { minVersion: "TLSv1.2" },
      auth: { user: "mailer", pass: "fake-smtp-password" },
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  );
  expect(smtp.sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: [email],
      text: expect.stringContaining(url),
      html: expect.any(String),
    }),
  );
  expect(smtp.close).toHaveBeenCalledOnce();
});
test("SMTP rejected recipients fail recovery delivery and still close the transport", async () => {
  smtp.sendMail.mockResolvedValue({ accepted: [], rejected: [email] });
  await expect(
    sendResetEmail(
      {
        ...base,
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "465",
        SMTP_USER: "mailer",
        SMTP_PASSWORD: "fake-smtp-password",
      },
      email,
      url,
      "fake-token",
      "smtp",
    ),
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(makeTransport).toHaveBeenCalledWith(
    expect.objectContaining({ secure: true }),
  );
  expect(smtp.close).toHaveBeenCalledOnce();
});
test("unconfigured providers and non-teacher recipients cannot send mail", async () => {
  await expect(
    sendResetEmail(base, email, url, "fake-token", "smtp"),
  ).rejects.toMatchObject({ statusCode: 503 });
  await sendResetEmail(
    {
      ...base,
      SMTP_HOST: "smtp.example.test",
      SMTP_USER: "mailer",
      SMTP_PASSWORD: "fake",
    },
    "outsider@example.test",
    url,
    "fake-token",
    "smtp",
  );
  expect(makeTransport).not.toHaveBeenCalled();
});
test("the selected provider is persisted per teacher and overrides only the deployment default", async () => {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).bind("delivery-owner", "Delivery Teacher", email, now, now),
    env.DB.prepare(
      "INSERT INTO email_delivery_settings (owner_id, provider, updated_at) VALUES (?, ?, ?)",
    ).bind("delivery-owner", "smtp", now),
  ]);
  expect(
    await selectedEmailProvider({
      ...base,
      DB: env.DB,
      AUTH_EMAIL_PROVIDER: "resend",
    }),
  ).toBe("smtp");
  expect(
    await selectedEmailProvider({
      ...base,
      DB: env.DB,
      TEACHER_EMAIL: "another@example.test",
      AUTH_EMAIL_PROVIDER: "resend",
    }),
  ).toBe("resend");
});

test("provider metadata never returns sending credentials or an invalid sender", async () => {
  const details = await emailDeliveryOptions({
    ...base,
    AUTH_EMAIL_FROM: "fake-resend-secret",
    RESEND_API_KEY: "fake-resend-secret",
    SMTP_PASSWORD: "fake-smtp-secret",
  });
  expect(details.sender).toBeNull();
  expect(JSON.stringify(details)).not.toContain("fake-resend-secret");
  expect(JSON.stringify(details)).not.toContain("fake-smtp-secret");
  expect(Object.keys(details).sort()).toEqual([
    "options",
    "provider",
    "sender",
  ]);
});

test("React Email escapes teacher content and renders HTML/plain text for account messages", async () => {
  const { renderAccountEmail } = await import("../src/emails/render.server");
  const welcome = await renderAccountEmail({
    kind: "welcome",
    name: '<script>alert("x")</script>',
    workspaceUrl: "https://quiz.example.test",
  });
  expect(welcome.html).toContain("&lt;script&gt;");
  expect(welcome.html).not.toContain("<script>");
  expect(welcome.html).toContain("#153f35");
  expect(welcome.html).toContain("#f9dc80");
  expect(welcome.text).toContain("teacher account is ready");
  expect(welcome.text).not.toContain("<html");
  const changed = await renderAccountEmail({
    kind: "password-changed",
    recoveryUrl: "https://quiz.example.test/forgot-password",
  });
  expect(changed.html).toContain("Recover my account");
  expect(changed.text).toContain("https://quiz.example.test/forgot-password");
  expect(changed.subject).toBe("Your Funkwiz password was updated");
});
test("optional account notifications skip unconfigured mail and contain provider failures", async () => {
  await sendAccountNotification(base, { email }, "welcome");
  expect(makeTransport).not.toHaveBeenCalled();
  const send = vi.fn(async () => {
    throw new Error("private provider failure");
  });
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(
    sendAccountNotification(
      { ...base, AUTH_EMAIL_PROVIDER: "cloudflare", EMAIL: { send } },
      { email },
      "password-changed",
    ),
  ).resolves.toBeUndefined();
  expect(send).toHaveBeenCalledOnce();
  expect(warning).toHaveBeenCalledWith(
    "Funkwiz account notification could not be delivered.",
  );
  expect(JSON.stringify(warning.mock.calls)).not.toContain(
    "private provider failure",
  );
});
