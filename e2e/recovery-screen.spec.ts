import { expect, test } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });

test("offers private-code recovery and explains unavailable email delivery", async ({
  page,
}, info) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s get you back in." }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Email link", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("tab", { name: "Private setup code", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Teacher email", { exact: true })
    .fill("teacher@example.test");
  await page
    .getByLabel("Private setup code", { exact: true })
    .fill("not-a-student-code");
  await page
    .getByLabel("New password", { exact: true })
    .fill("Mismatched-password-42!");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("Other-password-42!");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("don’t match");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `/tmp/fun-quiz-recovery-${info.project.name}.png`,
    fullPage: true,
  });
});

test("missing and malformed reset links offer a fresh recovery path without exposing a token", async ({
  page,
}) => {
  await page.goto("/reset-password?token=bad");
  await expect(
    page.getByRole("heading", { name: "Let’s try a fresh link." }),
  ).toBeVisible();
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "no-referrer",
  );
  await page.getByRole("link", { name: "Get a new reset link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});
