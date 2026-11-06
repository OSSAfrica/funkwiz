import { rankPlayers } from "./protocol";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  correctAnswerPoints,
  DEFAULT_SCORING,
  scoringFor,
  responseTimeCost,
} from "./scoring";

const legacyTiers = {
  type: "answer-order",
  points: [1000, 900, 800, 700],
} as const;

test("legacy correct answer tiers cap at 700 and invalid positions earn nothing", () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) => correctAnswerPoints(i, legacyTiers)),
    [1000, 900, 800, 700, 700, 700],
  );
  assert.equal(correctAnswerPoints(199, legacyTiers), 700);
  for (const position of [-1, NaN, 1.5])
    assert.equal(correctAnswerPoints(position, legacyTiers), 0);
});
test("missing rules preserve legacy flat scoring", () => {
  assert.equal(correctAnswerPoints(149, scoringFor({})), 1000);
  assert.equal(
    correctAnswerPoints(3, scoringFor({ pointsPerCorrect: 500 })),
    500,
  );
});

test("time-based correct points scale by question duration and stay within bounds", () => {
  for (const [elapsed, points] of [
    [0, 1000],
    [2000, 970],
    [5000, 925],
    [10000, 850],
    [15000, 775],
    [20000, 700],
    [25000, 700],
    [-100, 1000],
  ]) {
    assert.equal(
      correctAnswerPoints(19, DEFAULT_SCORING, elapsed, 20000),
      points,
    );
  }
  assert.equal(
    correctAnswerPoints(0, DEFAULT_SCORING, 5000, 20000),
    correctAnswerPoints(0, DEFAULT_SCORING, 10000, 40000),
  );
  assert.equal(correctAnswerPoints(-1, DEFAULT_SCORING, 0, 20000), 0);
  assert.equal(correctAnswerPoints(0, DEFAULT_SCORING, undefined, 20000), 700);
  assert.equal(responseTimeCost(1, 300000), 3);
});
test("accuracy outranks points, then points and precise timing separate ties", () => {
  const slow = {
    id: "slow",
    nickname: "Slow and accurate",
    correctCount: 8,
    score: 5600,
    speedCost: 8000000,
    joinedAt: 9,
  };
  const fast = {
    id: "fast",
    nickname: "Fast",
    correctCount: 7,
    score: 7000,
    speedCost: 0,
    joinedAt: 1,
  };
  assert.deepEqual(
    rankPlayers([fast, slow], DEFAULT_SCORING).map((p) => p.id),
    ["slow", "fast"],
  );
  const first = { ...fast, id: "first", score: 850, speedCost: 500050 };
  const second = { ...first, id: "second", speedCost: 500100, joinedAt: 0 };
  assert.deepEqual(
    rankPlayers([second, first], DEFAULT_SCORING).map((p) => [p.id, p.rank]),
    [
      ["first", 1],
      ["second", 2],
    ],
  );
  assert.deepEqual(
    rankPlayers([first, { ...first, id: "tie" }], DEFAULT_SCORING).map(
      (p) => p.rank,
    ),
    [1, 1],
  );
  assert.equal(rankPlayers([slow, fast], legacyTiers)[0].id, "fast");
});
