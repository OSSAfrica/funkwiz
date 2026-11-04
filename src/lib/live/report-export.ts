import { scoringFor, scoringSummary } from "./scoring";
import type { GameReport } from "./protocol";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export type ReportFormat = "pdf" | "csv" | "json";
export function reportFilename(report: GameReport, format: ReportFormat) {
  const slug = report.title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  // Bound Unicode titles too, leaving room for the code, timestamp and extension.
  const title =
    Array.from(slug).slice(0, 48).join("").replace(/-+$/, "") || "quiz";
  const code = /^\d{6}$/.test(report.code) ? report.code : "unknown";
  const ended = dayjs.utc(report.endedAt);
  const timestamp = ended.isValid()
    ? ended.format("YYYY-MM-DD-HH-mm-ss-[utc]")
    : "unknown-date";
  return `${title}-room-${code}-${timestamp}.${format}`;
}
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
    ["Funkwiz classroom report"],
    ["Quiz", report.title],
    ["Game code", report.code],
    ["Finished at (UTC)", new Date(report.endedAt).toISOString()],
    ["Players", report.playerCount],
    ["Questions played", summary.played],
    ["Answer accuracy (%)", summary.accuracy],
    ...((): (string | number)[][] => {
      const scoring = scoringFor(report);
      return scoring.type === "flat"
        ? [["Points per correct answer", scoring.pointsPerCorrect]]
        : [
            ["Scoring", scoringSummary(scoring)],
            ...scoring.points.map((points, i) => [
              i < 3 ? `Correct answer ${i + 1}` : "Remaining correct answers",
              points,
            ]),
          ];
    })(),
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
  link.download = reportFilename(report, format);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
