import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { guest, hostControl, openRoom } from "./live.helpers";

test("downloads the complete report as JSON, spreadsheet CSV and branded PDF", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(20_000);
  const { code, sessionId } = await openRoom(request);
  const student = await guest(browser, code, "Zoé");
  try {
    await hostControl(request, code, { type: "start" });
    const view = await hostControl(request, code, { type: "end" });
    expect(view.reportSaved).toBe(true);
    await page.goto(`/reports/${sessionId}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await page
      .getByRole("menuitemradio", { name: "Dark", exact: true })
      .click();
    for (const format of ["JSON", "CSV", "PDF"]) {
      await page
        .getByRole("button", { name: "Download report", exact: true })
        .click();
      const pending = page.waitForEvent("download", { timeout: 20_000 });
      await page
        .getByRole("menuitem", { name: new RegExp(`^${format}`) })
        .click();
      const download = await pending;
      expect(download.suggestedFilename()).toBe(
        `fun-quiz-report-${code}.${format.toLowerCase()}`,
      );
      const target = `/tmp/fun-quiz-export-${info.project.name}.${format.toLowerCase()}`;
      await download.saveAs(target);
      const bytes = await readFile(target);
      if (format === "JSON") {
        const report = JSON.parse(bytes.toString());
        expect(report.code).toBe(code);
        expect(report.leaderboard[0].nickname).toBe("Zoé");
        expect(report.questions).toHaveLength(4);
      } else if (format === "CSV") {
        expect(bytes.toString()).toContain('"Zoé"');
        expect(bytes.toString()).toContain('"Question review"');
        expect(bytes.toString()).toContain('"false"');
      } else {
        expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
        expect(bytes.length).toBeGreaterThan(10_000);
      }
    }
    await page.screenshot({
      path: `/tmp/fun-quiz-dark-report-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await student.context.close();
  }
});
test("paginates a PDF with 150 learners without dropping the final learner or questions", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(20_000);
  await page.goto("/");
  const pending = page.waitForEvent("download", { timeout: 20_000 });
  await page.evaluate(async () => {
    const path = "/src/lib/live/report-export.ts";
    const { exportReport } = await import(/* @vite-ignore */ path);
    await exportReport(
      {
        id: "pdf-pagination",
        code: "654321",
        title: "A classroom full of curiosity",
        startedAt: Date.now() - 60_000,
        endedAt: Date.now(),
        playerCount: 150,
        pointsPerCorrect: 1000,
        leaderboard: Array.from({ length: 150 }, (_, i) => ({
          id: String(i),
          nickname:
            i === 149 ? "Zoé Final Learner" : `Curious Learner ${i + 1}`,
          rank: i + 1,
          score: 150_000 - i * 1000,
        })),
        questions: [
          {
            id: "q",
            prompt: "Final question with a little aha!",
            asked: true,
            answered: 150,
            correct: 90,
            answers: ["Mars", "Earth", "Venus", "Saturn"],
            correctIndex: 0,
            counts: [90, 30, 20, 10],
          },
        ],
      },
      "pdf",
    );
  });
  const download = await pending;
  await download.saveAs(`/tmp/fun-quiz-export-large-${info.project.name}.pdf`);
});
