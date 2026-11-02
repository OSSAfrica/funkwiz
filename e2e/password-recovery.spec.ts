import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { liveOrigin, post } from "./live.helpers";
test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });
const email = "teacher@example.test",
  original = "Only-a-local-test-password-42!",
  setupCode = "e2e-only-fake-setup-code-never-use-in-production";

async function restore(request: Parameters<typeof post>[0]) {
  expect(
    (
      await post(request, "/api/auth/reset-with-setup-code", {
        email,
        setupCode,
        newPassword: original,
      })
    ).ok(),
  ).toBe(true);
}
test("recovers through the private setup code, rejects wrong proof and revokes old teacher sessions", async ({
  page,
  browser,
  request,
}) => {
  const old = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const signedIn = await post(
    old.request,
    `${liveOrigin}/api/auth/sign-in/email`,
    { email, password: original },
  );
  expect(signedIn.ok()).toBe(true);
  try {
    await page.goto("/forgot-password");
    await page.getByLabel("Teacher email", { exact: true }).fill(email);
    await page
      .getByLabel("Private setup code", { exact: true })
      .fill("wrong-private-code");
    await page
      .getByLabel("New password", { exact: true })
      .fill("New-private-recovery-password-42!");
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill("New-private-recovery-password-42!");
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "could not be verified",
    );
    await page
      .getByLabel("Private setup code", { exact: true })
      .fill(setupCode);
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Fresh password. Fresh start." }),
    ).toBeVisible();
    expect(
      await (
        await old.request.get(`${liveOrigin}/api/auth/get-session`)
      ).json(),
    ).toBeNull();
    expect(
      (
        await post(old.request, `${liveOrigin}/api/auth/sign-in/email`, {
          email,
          password: original,
        })
      ).status(),
    ).toBe(401);
    await page
      .getByRole("link", { name: /Sign in with your new password/ })
      .click();
    await page.getByLabel("Email address").fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("New-private-recovery-password-42!");
    await page.getByRole("button", { name: "Let’s go", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Your quiz collection/ }),
    ).toBeVisible();
  } finally {
    await restore(request);
    await old.close();
  }
});

test("completes an email-token reset and removes the token from the browser address", async ({
  page,
  request,
}) => {
  const id = randomUUID(),
    token = randomUUID().replaceAll("-", ""),
    expiredToken = randomUUID().replaceAll("-", ""),
    now = Date.now();
  // Seed only the disposable e2e database, as if the fake teacher had received an email.
  await promisify(execFile)(
    "bun",
    [
      "x",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "e2e/worker/wrangler.jsonc",
      "--persist-to",
      ".wrangler/e2e-state",
      "--command",
      `INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) SELECT '${id}', 'reset-password:${token}', id, ${now + 1800000}, ${now}, ${now} FROM user WHERE email = '${email}'; INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) SELECT '${randomUUID()}', 'reset-password:${expiredToken}', id, 0, ${now}, ${now} FROM user WHERE email = '${email}'`,
    ],
    {
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: "/tmp/fun-quiz-recovery-seed.log",
      },
    },
  );
  try {
    expect(
      (
        await post(request, "/api/auth/reset-password", {
          token: expiredToken,
          newPassword: original,
        })
      ).status(),
    ).toBe(400);
    await page.goto(`/reset-password?token=${token}`);
    await page
      .getByLabel("New password", { exact: true })
      .fill("New-email-recovery-password-42!");
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill("New-email-recovery-password-42!");
    await page
      .getByRole("button", { name: "Save new password", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Fresh password. Fresh start." }),
    ).toBeVisible();
    await expect(page).toHaveURL(`${liveOrigin}/reset-password`);
    expect(
      (
        await post(request, "/api/auth/sign-in/email", {
          email,
          password: "New-email-recovery-password-42!",
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await post(request, "/api/auth/reset-password", {
          token,
          newPassword: original,
        })
      ).status(),
    ).toBe(400);
  } finally {
    await restore(request);
  }
});
