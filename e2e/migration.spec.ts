import { test, expect } from "@playwright/test";

test("copies browser drafts explicitly and persists across a fresh browser context", async ({
  page,
  browser,
}, info) => {
  const title = `${info.project.name} Migrated lesson`;
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    (title) =>
      localStorage.setItem(
        "fun-quiz.library.v1",
        JSON.stringify([
          {
            id: crypto.randomUUID(),
            title,
            description: "A draft from the original browser library.",
            cover: "nature",
            updatedAt: new Date().toISOString(),
            questions: [
              {
                id: crypto.randomUUID(),
                prompt: "How many legs does an insect have?",
                answers: ["Four", "Six", "Eight", "Ten"],
                correctIndex: 1,
                duration: 15,
              },
            ],
          },
        ]),
      ),
    title,
  );
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Browser drafts", exact: true })
    .click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy 1 draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("fun-quiz.library.v1")),
  ).toContain(title);
  const context = await browser.newContext({
    storageState: ".playwright/teacher-session.json",
  });
  try {
    const other = await context.newPage();
    await other.goto("http://127.0.0.1:3100/");
    await expect(
      other.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect(
      await other.evaluate(() => localStorage.getItem("fun-quiz.library.v1")),
    ).toBeNull();
    await page
      .getByRole("button", { name: "Browser drafts", exact: true })
      .click();
    await expect(
      page.getByText("No uncopied browser drafts found.", { exact: false }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
