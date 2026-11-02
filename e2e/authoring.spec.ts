import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: /Your quiz collection/ }),
  ).toBeVisible();
});

test("renders without hydration errors, fits the viewport, and respects reduced motion", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(
    page
      .locator(".quiz-card")
      .getByRole("heading", { name: "Out of this world" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import questions", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `/tmp/fun-quiz-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".reveal-in")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(errors).toEqual([]);
});

test("creates a quiz, applies common timing, overrides one question, and survives reload", async ({
  page,
}, testInfo) => {
  const title = `${testInfo.project.name} Classroom science`;
  await page
    .getByRole("button", { name: "Create a quiz", exact: true })
    .click();
  await page.getByLabel("Quiz title", { exact: true }).fill(title);
  await page
    .getByLabel("Question", { exact: true })
    .fill("Which planet is red?");
  for (const [i, answer] of ["Earth", "Mars", "Venus", "Saturn"].entries()) {
    await page
      .getByRole("textbox", { name: `Answer ${i + 1}`, exact: true })
      .fill(answer);
  }
  await page.getByRole("radio", { name: "Answer 2 is correct" }).check();
  await page.getByLabel("Time to apply to all questions").fill("15");
  await page.getByRole("button", { name: "Apply to all" }).click();
  await expect(page.getByLabel("Time limit", { exact: true })).toHaveValue(
    "15",
  );
  await page.getByRole("button", { name: "Add question", exact: true }).click();
  await expect(page.getByLabel("Time limit", { exact: true })).toHaveValue(
    "15",
  );
  await page
    .getByLabel("Question", { exact: true })
    .fill("What do we breathe?");
  for (const [i, answer] of ["Oxygen", "Helium", "Neon", "Argon"].entries()) {
    await page
      .getByRole("textbox", { name: `Answer ${i + 1}`, exact: true })
      .fill(answer);
  }
  await page.getByLabel("Time limit", { exact: true }).fill("35");
  await page.getByRole("button", { name: "Save quiz", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: `Edit ${title}`, exact: true })
    .click();
  await expect(page.getByLabel("Time limit", { exact: true })).toHaveValue(
    "15",
  );
  await page.getByRole("button", { name: "2 What do we breathe?" }).click();
  await expect(page.getByLabel("Time limit", { exact: true })).toHaveValue(
    "35",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: `Export ${title}`, exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    `${testInfo.project.name}-classroom-science.json`,
  );
});

test("validates imports and requires review before saving", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const title = `${testInfo.project.name} Space adventure`;
  await page
    .getByRole("button", { name: "Import questions", exact: true })
    .click();
  await page.getByLabel("Your quiz JSON").fill("{");
  await page.getByRole("button", { name: "Review questions" }).click();
  await expect(page.getByRole("alert")).toContainText("JSON could not be read");
  await page.getByRole("button", { name: "Use example JSON" }).click();
  await page.getByRole("button", { name: "Review questions" }).click();
  await expect(page.getByLabel("Quiz title", { exact: true })).toHaveValue(
    "A little space adventure",
  );
  await page.getByLabel("Quiz title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Save quiz", exact: true }).click();
  // Cold Workers compilation can outlast the default five-second assertion.
  await expect(
    page.getByRole("dialog", { name: "Make this quiz your own" }),
  ).toBeHidden({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page.getByRole("button", { name: "Keep quiz" }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
});

test("supports runtime display changes and cancels automatic cooldown in manual mode", async ({
  page,
}) => {
  await page.clock.install();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Out of this world",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await expect(page.getByLabel("Cooldown between questions")).toBeDisabled();
  await page.getByText("Keep it rolling", { exact: true }).click();
  await expect(page.getByLabel("Cooldown between questions")).toBeEnabled();
  await page.getByLabel("Cooldown between questions").fill("3");
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.fastForward(30_000);
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(20_100);
  await expect(page.getByText("THE BIG REVEAL")).toBeVisible();
  await page.getByRole("switch", { name: "Automatic progression" }).click();
  await page.clock.fastForward(10_000);
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await page.getByText("Shared screen", { exact: true }).click();
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  await page.getByRole("tab", { name: "Student screen" }).click();
  await expect(
    page.getByRole("heading", { name: "Eyes on the shared screen!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Answer 3", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Answer locked in");
});
