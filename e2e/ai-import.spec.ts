import { test, expect } from "@playwright/test";

test("copies an AI prompt with the JSON sample, falls back to manual copy, and preserves import review", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Import questions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use example JSON", exact: true })
    .click();
  const sample = await page
    .getByLabel("Your quiz JSON", { exact: true })
    .inputValue();
  await page.getByRole("tab", { name: "AI prompt", exact: true }).click();
  const prompt = page.getByLabel("AI prompt with example JSON", {
    exact: true,
  });
  await expect(prompt).toHaveAttribute("readonly", "");
  const content = await prompt.inputValue();
  expect(content).toContain(sample);
  expect(content).toContain("Topic:");
  expect(content).toContain("Source material:");
  expect(content).toContain("ZERO-BASED");
  await expect(
    page.getByRole("button", { name: "Review questions", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          Object.assign(window, { copiedPrompt: text });
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Copy AI prompt", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { copiedPrompt: string }).copiedPrompt,
    ),
  ).toBe(content);
  await expect(page.getByRole("status")).toContainText("Prompt copied");
  await page.screenshot({
    path: `/tmp/funkwiz-ai-prompt-${info.project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Blocked", "NotAllowedError");
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Copy AI prompt", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("copy it manually");
  expect(
    await prompt.evaluate(
      (node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart,
    ),
  ).toBe(content.length);
  await page.getByRole("tab", { name: "Import JSON", exact: true }).click();
  await expect(page.getByLabel("Your quiz JSON", { exact: true })).toHaveValue(
    sample,
  );
  await page
    .getByRole("button", { name: "Review questions", exact: true })
    .click();
  await expect(page.getByLabel("Quiz title", { exact: true })).toHaveValue(
    "A little space adventure",
  );
});
