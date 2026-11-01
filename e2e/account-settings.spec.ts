import { test, expect } from "@playwright/test";

test("password changes revoke other sessions", async ({ page, browser }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email address").fill("teacher@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Only-a-local-test-password-42!");
  await page.getByRole("button", { name: "Let’s go", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Your quiz collection/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Teacher account", exact: true })
    .click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("Only-a-local-test-password-42!");
  await page
    .getByLabel("New password", { exact: true })
    .fill("Only-a-local-test-password-42!");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("Only-a-local-test-password-42!");
  await page
    .getByRole("button", { name: "Save password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password saved");
  const oldSession = await browser.newContext({
    storageState: ".playwright/teacher-session.json",
  });
  try {
    const other = await oldSession.newPage();
    await other.goto("http://127.0.0.1:3100/");
    await expect(other).toHaveURL(/\/login/);
    await other.waitForLoadState("networkidle");
  } finally {
    await oldSession.close();
  }
});
