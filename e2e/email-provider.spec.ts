import { expect, test } from "@playwright/test";

test("saves the teacher's choice of Resend, Cloudflare Email, or another SMTP service", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Teacher account", exact: true })
    .click();
  let form = page.getByRole("form", { name: "Password reset email settings" });
  const provider = () => form.getByLabel("Email provider", { exact: true });
  await provider().click();
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(page.getByRole("listbox")).toHaveCSS(
    "background-color",
    "rgb(255, 254, 251)",
  );
  await page.screenshot({
    path: `/tmp/fun-quiz-email-select-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  const choose = async (name: RegExp) => {
    await provider().click();
    await page.getByRole("option", { name }).click();
  };
  try {
    await choose(/^Other SMTP service/);
    await form
      .getByRole("button", { name: "Save email provider", exact: true })
      .click();
    await expect(form.getByRole("status")).toContainText(
      "Email provider saved",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Teacher account", exact: true })
      .click();
    form = page.getByRole("form", { name: "Password reset email settings" });
    await expect(provider()).toContainText("Other SMTP service");
    await page.reload();
    await page
      .getByRole("button", { name: "Teacher account", exact: true })
      .click();
    form = page.getByRole("form", { name: "Password reset email settings" });
    await expect(provider()).toContainText("Other SMTP service");
    await choose(/^Cloudflare Email/);
    await form
      .getByRole("button", { name: "Save email provider", exact: true })
      .click();
    await expect(form.getByRole("status")).toContainText(
      "Email provider saved",
    );
    await expect(
      form.getByText(/Email recovery stays unavailable/),
    ).toBeVisible();
    await form.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/fun-quiz-email-settings-${info.project.name}.png`,
    });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  } finally {
    await choose(/^Resend/);
    await form
      .getByRole("button", { name: "Save email provider", exact: true })
      .click();
    await expect(form.getByRole("status")).toContainText(
      "Email provider saved",
    );
  }
});

test("anonymous clients cannot inspect or change email-provider settings", async ({
  browser,
}) => {
  const visitor = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  try {
    const page = await visitor.newPage();
    await page.goto("http://127.0.0.1:3100/login");
    const result = await page.evaluate(async () => {
      const path = "/src/lib/email.functions.ts";
      const api = await import(/* @vite-ignore */ path);
      const results: boolean[] = [];
      try {
        await api.getEmailDeliverySettings();
        results.push(true);
      } catch {
        results.push(false);
      }
      try {
        await api.saveEmailProvider({ data: "smtp" });
        results.push(true);
      } catch {
        results.push(false);
      }
      return results;
    });
    expect(result).toEqual([false, false]);
  } finally {
    await visitor.close();
  }
});
