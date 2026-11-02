import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, reportCsv, reportSummary } from "./report-export";
import type { GameReport } from "./protocol";
const report: GameReport = {
  id: "test",
  code: "123456",
  title: 'A "great", quiz',
  startedAt: 0,
  endedAt: 1_800_000_000_000,
  playerCount: 1,
  pointsPerCorrect: 1000,
  leaderboard: [{ id: "one", nickname: "=HYPERLINK(1)", rank: 1, score: 1000 }],
  questions: [
    {
      id: "q",
      prompt: "Line one\nLine two",
      asked: true,
      answered: 1,
      correct: 1,
      answers: ["Mars", "Earth"],
      correctIndex: 0,
      counts: [1, 0],
    },
  ],
};
test("CSV preserves quotes, commas and line breaks and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('a,b"c'), '"a,b""c"');
  for (const value of ["=1+1", " +cmd", "@SUM(A1)", "\t=1", "\r=1", "-2+3"])
    assert.ok(csvCell(value).startsWith("\"'"));
  const csv = reportCsv(report);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"A ""great"", quiz"'));
  assert.ok(csv.includes('"Line one\nLine two"'));
  assert.ok(csv.includes('"\'=HYPERLINK(1)"'));
  assert.ok(csv.includes('"Mars","true","1"'));
  assert.ok(csv.includes('"Earth","false","0"'));
});
test("report accuracy uses actual answers and handles an empty game", () => {
  assert.deepEqual(reportSummary(report), {
    answered: 1,
    correct: 1,
    accuracy: 100,
    played: 1,
  });
  assert.deepEqual(reportSummary({ ...report, questions: [] }), {
    answered: 0,
    correct: 0,
    accuracy: 0,
    played: 0,
  });
});

test("CSV describes ordered rules while preserving legacy report scores", () => {
  assert.ok(reportCsv(report).includes('"Points per correct answer","1000"'));
  const csv = reportCsv({
    ...report,
    pointsPerCorrect: undefined,
    scoring: { type: "answer-order", points: [1000, 900, 800, 700] },
  });
  assert.ok(csv.includes('"Correct answer 2","900"'));
  assert.ok(csv.includes('"Remaining correct answers","700"'));
  assert.ok(!csv.includes('"Points per correct answer"'));
});
