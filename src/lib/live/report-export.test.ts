import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvCell,
  reportCsv,
  reportSummary,
  reportFilename,
} from "./report-export";
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
test("report filenames use quiz title, room and the stable UTC finish time for every format", () => {
  const game = {
    ...report,
    code: "001234",
    endedAt: Date.UTC(2026, 10, 4, 9, 30, 5),
  };
  for (const format of ["pdf", "csv", "json"] as const) {
    assert.equal(
      reportFilename(game, format),
      `a-great-quiz-room-001234-2026-11-04-09-30-05-utc.${format}`,
    );
  }
  assert.notEqual(
    reportFilename(game, "pdf"),
    reportFilename({ ...game, endedAt: game.endedAt + 1000 }, "pdf"),
  );
});

test("report filenames handle unsafe punctuation, accents, non-Latin titles and empty slugs", () => {
  assert.equal(
    reportFilename(
      { ...report, title: '  Café / 世界: "quiz"? <fun> | **  ' },
      "csv",
    ).split("-room-")[0],
    "cafe-世界-quiz-fun",
  );
  const fallback = reportFilename(
    { ...report, title: "../💥 :?", code: "../bad", endedAt: NaN },
    "json",
  );
  assert.equal(fallback, "quiz-room-unknown-unknown-date.json");
  const long = reportFilename({ ...report, title: "𐐀".repeat(120) }, "pdf");
  assert.ok(new TextEncoder().encode(long).length < 255);
  assert.ok(!/[\s/\\:*?"<>|]/u.test(long));
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

test("accuracy-first CSV preserves saved rank order and includes correct counts and normalized timing", () => {
  const csv = reportCsv({
    ...report,
    scoring: { type: "accuracy-first", basePoints: 700, speedBonus: 300 },
    leaderboard: [
      {
        id: "accurate",
        nickname: "Thoughtful",
        rank: 1,
        score: 5600,
        correctCount: 8,
        speedCost: 8000000,
      },
      {
        id: "quick",
        nickname: "Quick",
        rank: 2,
        score: 7000,
        correctCount: 7,
        speedCost: 0,
      },
    ],
  });
  assert.ok(csv.includes('"Correct answers"'));
  assert.ok(csv.includes('"1","Thoughtful","8","5600","8"'));
  assert.ok(csv.includes('"2","Quick","7","7000","0"'));
  assert.ok(csv.includes("Accuracy first"));
  assert.ok(!csv.includes('"Correct answer 2","900"'));
});
