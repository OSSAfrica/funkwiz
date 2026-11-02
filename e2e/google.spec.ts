import { test, expect } from "@playwright/test";

test("shows Google sign-in when both credentials are configured", async ({
  page,
}) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("or use your email", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});
test("teacher setup validates its private setup code before creating an account", async ({
  page,
}) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Set up teacher account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Teacher");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("teacher@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Only-a-local-test-password-42!");
  await page
    .getByLabel("Private setup code", { exact: true })
    .fill("wrong-code");
  await page
    .getByRole("button", { name: "Create teacher account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "private teacher setup code",
  );
  await page
    .getByLabel("Private setup code", { exact: true })
    .fill("e2e-only-fake-setup-code-never-use-in-production");
  await page
    .getByRole("button", { name: "Create teacher account", exact: true })
    .click();
  // The optional welcome notification has an 8-second provider timeout.
  await expect(
    page.getByRole("heading", { name: /Your quiz collection/ }),
  ).toBeVisible({ timeout: 15_000 });
});

test("enables email recovery when sending credentials and a sender are configured", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Email link", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Send reset link", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Private setup code", { exact: true }),
  ).toHaveCount(0);
});
