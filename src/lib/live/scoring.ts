export type ScoringRules =
  | { type: "accuracy-first"; basePoints: number; speedBonus: number }
  | { type: "flat"; pointsPerCorrect: number }
  | { type: "answer-order"; points: readonly [number, number, number, number] };

export const DEFAULT_SCORING: ScoringRules = {
  type: "accuracy-first",
  basePoints: 700,
  speedBonus: 300,
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
/** One million units means using the whole timer; lower is faster. */
export function responseTimeCost(
  elapsedMs: number | undefined,
  durationMs: number | undefined,
) {
  if (
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(durationMs) ||
    !durationMs ||
    durationMs < 0
  )
    return 1_000_000;
  return Math.round(
    Math.min(1, Math.max(0, elapsedMs! / durationMs)) * 1_000_000,
  );
}

export function correctAnswerPoints(
  position: number,
  scoring: ScoringRules,
  elapsedMs?: number,
  durationMs?: number,
) {
  if (!Number.isInteger(position) || position < 0) return 0;
  if (scoring.type === "accuracy-first")
    return (
      scoring.basePoints +
      Math.round(
        scoring.speedBonus *
          (1 - responseTimeCost(elapsedMs, durationMs) / 1_000_000),
      )
    );
  return scoring.type === "flat"
    ? scoring.pointsPerCorrect
    : scoring.points[Math.min(position, 3)];
}

export function scoringSummary(scoring: ScoringRules) {
  if (scoring.type === "accuracy-first")
    return `Accuracy first: more correct answers rank higher. Each correct answer earns ${scoring.basePoints}–${scoring.basePoints + scoring.speedBonus} points based on time used. With equal accuracy, higher points win; precise timing breaks remaining ties. Identical results share a rank.`;
  if (scoring.type === "flat")
    return `${scoring.pointsPerCorrect.toLocaleString("en-GB")} points per correct answer.`;
  const [first, second, third, rest] = scoring.points.map((n) =>
    n.toLocaleString("en-GB"),
  );
  return `Correct answers: 1st ${first}, 2nd ${second}, 3rd ${third}, then ${rest} each. Order resets every question.`;
}
