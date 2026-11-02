import type { GameReport } from "./protocol";

export type ReportFormat = "pdf" | "csv" | "json";
export function reportSummary(report: GameReport) {
  const answered = report.questions.reduce((sum, q) => sum + q.answered, 0);
  const correct = report.questions.reduce((sum, q) => sum + q.correct, 0);
  return {
    answered,
    correct,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    played: report.questions.filter((q) => q.asked).length,
  };
}
export function reportDate(report: GameReport) {
  return new Date(report.endedAt).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
// Quote every cell, escape quotes, and neutralize spreadsheet formulas in user content.
export function csvCell(value: string | number | boolean | null) {
  const text = String(value ?? "");
  const safe =
    /^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(report: GameReport) {
  const summary = reportSummary(report);
  const rows: (string | number | boolean | null)[][] = [
    ["Fun Quiz classroom report"],
    ["Quiz", report.title],
    ["Game code", report.code],
    ["Finished at (UTC)", new Date(report.endedAt).toISOString()],
    ["Players", report.playerCount],
    ["Questions played", summary.played],
    ["Answer accuracy (%)", summary.accuracy],
    ["Points per correct answer", report.pointsPerCorrect],
    [],
    ["Leaderboard"],
    ["Rank", "Nickname", "Score"],
    ...report.leaderboard.map((p) => [p.rank, p.nickname, p.score]),
    [],
    ["Question review"],
    [
      "Question",
      "Prompt",
      "Asked",
      "Answered",
      "Correct",
      "Answer",
      "Is correct answer",
      "Responses",
    ],
    ...report.questions.flatMap((q, index) =>
      q.answers.map((answer, i) => [
        index + 1,
        q.prompt,
        q.asked,
        q.answered,
        q.correct,
        answer,
        q.correctIndex === i,
        q.counts[i] ?? 0,
      ]),
    ),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
export async function exportReport(report: GameReport, format: ReportFormat) {
  const blob =
    format === "pdf"
      ? await (await import("./report-pdf")).reportPdf(report)
      : new Blob(
          [
            format === "csv"
              ? reportCsv(report)
              : JSON.stringify(report, null, 2),
          ],
          {
            type:
              format === "csv"
                ? "text/csv;charset=utf-8"
                : "application/json;charset=utf-8",
          },
        );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fun-quiz-report-${report.code}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
