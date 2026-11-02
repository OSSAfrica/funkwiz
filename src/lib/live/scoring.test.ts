import { test } from "node:test";
import assert from "node:assert/strict";
import { correctAnswerPoints, DEFAULT_SCORING, scoringFor } from "./scoring";

test("correct answer tiers cap at 700 and invalid positions earn nothing", () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) =>
      correctAnswerPoints(i, DEFAULT_SCORING),
    ),
    [1000, 900, 800, 700, 700, 700],
  );
  assert.equal(correctAnswerPoints(199, DEFAULT_SCORING), 700);
  for (const position of [-1, NaN, 1.5])
    assert.equal(correctAnswerPoints(position, DEFAULT_SCORING), 0);
});
test("missing rules preserve legacy flat scoring", () => {
  assert.equal(correctAnswerPoints(149, scoringFor({})), 1000);
  assert.equal(
    correctAnswerPoints(3, scoringFor({ pointsPerCorrect: 500 })),
    500,
  );
});
