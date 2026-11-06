import { test, expect } from "@playwright/test";
import { guest, hostControl, openRoom, post } from "./live.helpers";

test("more correct answers win even with fewer points, and saved reports explain the ranking", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const quizId = await page.evaluate(async () => {
    const path = "/src/lib/quizzes.functions.ts";
    const api = await import(/* @vite-ignore */ path);
    return (
      await api.persistQuiz({
        data: {
          title: "Accuracy beats rushing",
          questions: Array.from({ length: 4 }, (_, i) => ({
            prompt: `Question ${i + 1}: which planet is red?`,
            answers: ["Earth", "Mars", "Venus", "Saturn"],
            correctIndex: 1,
            duration: 5,
          })),
        },
      })
    ).id;
  });
  const { code, sessionId } = await openRoom(request, undefined, quizId);
  const accurate = await guest(browser, code, "Thoughtful Ada");
  const quick = await guest(browser, code, "Speedy Ben");
  try {
    await expect(accurate.page.locator(".student-lobby")).toContainText(
      "Accuracy first",
    );
    await expect(
      accurate.page.getByRole("link", {
        name: "Help and scoring (opens in a new tab)",
      }),
    ).toHaveAttribute("target", "_blank");
    expect(
      await accurate.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    let view = await hostControl(request, code, { type: "start" });
    for (let index = 0; index < 4; index++) {
      const questionId = view.question!.id;
      const fast = await post(
        quick.context.request,
        `/api/live/rooms/${code}/answer`,
        { questionId, answer: index === 3 ? 0 : 1 },
      );
      expect(fast.ok()).toBe(true);
      await expect
        .poll(() => view.deadline! - Date.now(), {
          intervals: [40],
          timeout: 6500,
        })
        .toBeLessThan(450);
      const slow = await post(
        accurate.context.request,
        `/api/live/rooms/${code}/answer`,
        { questionId, answer: 1 },
      );
      expect(slow.ok()).toBe(true);
      view = await hostControl(request, code, {
        type: "reveal",
        questionIndex: index,
      });
      if (index < 3)
        view = await hostControl(request, code, {
          type: "next",
          questionIndex: index,
        });
    }
    view = await hostControl(request, code, { type: "end" });
    expect(view.leaderboard[0]).toMatchObject({
      nickname: "Thoughtful Ada",
      correctCount: 4,
      rank: 1,
    });
    expect(view.leaderboard[1]).toMatchObject({
      nickname: "Speedy Ben",
      correctCount: 3,
      rank: 2,
    });
    expect(view.leaderboard[0].score).toBeLessThan(view.leaderboard[1].score);
    await page.goto(`/reports/${sessionId}`);
    const rows = page
      .getByRole("region", { name: "Leaderboard", exact: true })
      .locator("li");
    await expect(rows.first()).toContainText("Thoughtful Ada");
    await expect(rows.first()).toContainText("4 correct");
    await expect(rows.nth(1)).toContainText("3 correct");
    await expect(page.locator(".scoring-note")).toContainText("Accuracy first");
    await page.screenshot({
      path: `.playwright/accuracy-report-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await accurate.context.close();
    await quick.context.close();
  }
});

test.describe("public help", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("explains scoring and features without sign-in, with accessible FAQ disclosures", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text()))
        errors.push(message.text());
    });
    await page.goto("/help");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Accuracy wins. Speed breaks ties." }),
    ).toBeVisible();
    await expect(page).toHaveTitle("Help, scoring and FAQs | Funkwiz");
    const details = page.locator("details").filter({
      has: page.locator("summary", { hasText: "How are points calculated?" }),
    });
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details).toContainText("850");
    await expect(
      page.getByRole("link", {
        name: "GitHub documentation (opens in a new tab)",
      }),
    ).toHaveAttribute("href", /github.com\/OSSAfrica\/funkwiz/);
    for (const theme of ["Light", "Dark"]) {
      await page.getByRole("button", { name: "Appearance settings" }).click();
      await page
        .getByRole("menuitemradio", { name: theme, exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Accuracy wins. Speed breaks ties." }),
    ).toBeVisible();
    await page.goto("/join");
    await page
      .getByRole("link", { name: "Help & scoring", exact: true })
      .click();
    await expect(page).toHaveURL(/\/help$/);
    expect(errors).toEqual([]);
  });
});
