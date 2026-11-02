import type { RoomView, RoomPhase } from "./protocol";

export type AudioCue =
  | "question"
  | "selected"
  | "correct"
  | "incorrect"
  | "reveal"
  | "finished";
export type AudioScene = {
  phase: RoomPhase | null;
  audible: boolean;
  questionId: string;
  deadline: number | null;
};
export function audioScene(
  snapshot: RoomView | null,
  offset: number,
  connected: boolean,
  visible: boolean,
): AudioScene {
  return {
    phase: snapshot?.phase ?? null,
    audible: Boolean(
      snapshot &&
      connected &&
      visible &&
      !snapshot.paused &&
      snapshot.phase !== "closed",
    ),
    questionId: snapshot?.question?.id ?? "",
    deadline: snapshot?.deadline == null ? null : snapshot.deadline - offset,
  };
}
export function audioCues(
  previous: RoomView | null,
  next: RoomView,
): AudioCue[] {
  // Opening/rejoining a page, changing volume or toggling sound must not replay old results.
  if (!previous || previous.sessionId !== next.sessionId) return [];
  const sameQuestion = previous.question?.id === next.question?.id;
  if (next.phase === "finished" && previous.phase !== "finished")
    return ["finished"];
  if (
    next.phase === "question" &&
    (previous.phase !== "question" || !sameQuestion)
  )
    return ["question"];
  if (
    next.phase === "reveal" &&
    (previous.phase !== "reveal" || !sameQuestion)
  ) {
    if (next.self?.correct === true) return ["correct"];
    if (next.self?.correct === false) return ["incorrect"];
    return ["reveal"];
  }
  if (
    next.phase === "question" &&
    sameQuestion &&
    previous.self?.answer == null &&
    next.self?.answer != null
  )
    return ["selected"];
  return [];
}
export const musicSceneLevel = (phase: RoomPhase | null) =>
  phase === "question"
    ? 0.36
    : phase === "reveal"
      ? 0.7
      : phase === "lobby"
        ? 1
        : 0;
