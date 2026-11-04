import { test, expect } from "@playwright/test";
import { guest, hostControl, openRoom, post } from "./live.helpers";

test("shows per-question accuracy based on submitted answers and distinguishes missing responses from skipped questions", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(90_000);
  const { code, sessionId } = await openRoom(request);
  const students = [];
  try {
    for (const name of ["Ada", "Ben", "Cam"]) {
      students.push(await guest(browser, code, `${info.project.name} ${name}`));
    }
    const started = await hostControl(request, code, { type: "start" });
    const questionId = started.question!.id;
    for (const [index, student] of students.slice(0, 2).entries()) {
      const response = await post(
        student.context.request,
        `/api/live/rooms/${code}/answer`,
        { questionId, answer: index },
      );
      expect(response.ok()).toBe(true);
    }
    await hostControl(request, code, { type: "reveal", questionIndex: 0 });
    await hostControl(request, code, { type: "next", questionIndex: 0 });
    const finished = await hostControl(request, code, { type: "end" });
    expect(finished.reportSaved).toBe(true);
    await page.goto(`/reports/${sessionId}`);
    const cards = page.locator(".question-review-card");
    await expect(cards.first().locator(".review-question-accuracy")).toHaveText(
      "50% correct",
    );
    await expect(
      cards.first().locator(".review-question-heading"),
    ).toContainText("1 / 2 correct");
    await expect(cards.nth(1).locator(".review-question-accuracy")).toHaveText(
      "No answers",
    );
    await expect(
      cards.nth(1).locator(".review-question-heading"),
    ).toContainText("0 / 0 correct");
    await expect(
      cards.nth(2).locator(".review-question-heading"),
    ).toContainText("Not asked");
    await expect(cards.nth(2).locator(".review-question-accuracy")).toHaveCount(
      0,
    );
    await expect(page.locator(".report-stat-grid")).toContainText("50%");
    for (const theme of ["Light", "Dark"]) {
      await page.getByRole("button", { name: "Appearance settings" }).click();
      await page
        .getByRole("menuitemradio", { name: theme, exact: true })
        .click();
      await expect(
        cards.first().locator(".review-question-accuracy"),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  } finally {
    for (const student of students) await student.context.close();
  }
});
