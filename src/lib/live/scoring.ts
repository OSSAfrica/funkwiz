export type ScoringRules =
  | { type: "flat"; pointsPerCorrect: number }
  | { type: "answer-order"; points: readonly [number, number, number, number] };

export const DEFAULT_SCORING: ScoringRules = {
  type: "answer-order",
  points: [1000, 900, 800, 700],
};

/** Missing rules identify rooms/reports created before ordered scoring. */
export function scoringFor(value: {
  scoring?: ScoringRules;
  pointsPerCorrect?: number;
}): ScoringRules {
  return (
    value.scoring ?? {
      type: "flat",
      pointsPerCorrect: value.pointsPerCorrect ?? 1000,
    }
  );
}

/** Zero-based position among correct answers, in server-accepted order. */
export function correctAnswerPoints(position: number, scoring: ScoringRules) {
  if (!Number.isInteger(position) || position < 0) return 0;
  return scoring.type === "flat"
    ? scoring.pointsPerCorrect
    : scoring.points[Math.min(position, 3)];
}

export function scoringSummary(scoring: ScoringRules) {
  if (scoring.type === "flat")
    return `${scoring.pointsPerCorrect.toLocaleString("en-GB")} points per correct answer.`;
  const [first, second, third, rest] = scoring.points.map((n) =>
    n.toLocaleString("en-GB"),
  );
  return `Correct answers: 1st ${first}, 2nd ${second}, 3rd ${third}, then ${rest} each. Order resets every question.`;
}
