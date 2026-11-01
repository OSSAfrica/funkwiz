import type { DisplayMode, GameSettings, Quiz } from "./quiz";

export type Rehearsal = {
  quiz: Quiz;
  settings: GameSettings;
  display: DisplayMode;
  index: number;
  phase: "question" | "reveal" | "finished";
  deadline: number | null;
  paused: boolean;
  remaining: number;
  answer: number | null;
};
export function beginRehearsal(
  quiz: Quiz,
  settings: GameSettings,
  now: number,
): Rehearsal {
  return {
    quiz,
    settings,
    display: settings.display,
    index: 0,
    phase: "question",
    deadline: now + quiz.questions[0].duration * 1000,
    paused: false,
    remaining: 0,
    answer: null,
  };
}
export type GameAction =
  | { type: "tick"; now: number }
  | { type: "pause"; now: number }
  | { type: "next"; now: number }
  | { type: "reveal"; now: number }
  | { type: "settings"; settings: GameSettings; now: number }
  | { type: "answer"; answer: number };
function reveal(state: Rehearsal, now: number): Rehearsal {
  return {
    ...state,
    phase: "reveal",
    paused: false,
    remaining: 0,
    deadline:
      state.settings.progression === "automatic"
        ? now + state.settings.cooldown * 1000
        : null,
  };
}
function next(state: Rehearsal, now: number): Rehearsal {
  const index = state.index + 1;
  if (index >= state.quiz.questions.length)
    return { ...state, phase: "finished", deadline: null, paused: false };
  return {
    ...state,
    index,
    phase: "question",
    display: state.settings.display,
    answer: null,
    paused: false,
    remaining: 0,
    deadline: now + state.quiz.questions[index].duration * 1000,
  };
}
export function rehearsalReducer(
  state: Rehearsal,
  action: GameAction,
): Rehearsal {
  switch (action.type) {
    case "tick":
      if (
        state.paused ||
        state.deadline === null ||
        action.now < state.deadline
      )
        return state;
      return state.phase === "question"
        ? reveal(state, action.now)
        : state.phase === "reveal"
          ? next(state, action.now)
          : state;
    case "reveal":
      return state.phase === "question" ? reveal(state, action.now) : state;
    case "next":
      return state.phase === "reveal" ? next(state, action.now) : state;
    case "answer":
      return state.phase === "question" &&
        !state.paused &&
        state.answer === null
        ? { ...state, answer: action.answer }
        : state;
    case "pause":
      if (state.deadline === null && !state.paused) return state;
      return state.paused
        ? { ...state, paused: false, deadline: action.now + state.remaining }
        : {
            ...state,
            paused: true,
            remaining: Math.max(0, (state.deadline ?? action.now) - action.now),
            deadline: null,
          };
    case "settings": {
      const changedProgression =
        state.settings.progression !== action.settings.progression;
      const deadline =
        state.phase === "reveal" && changedProgression
          ? action.settings.progression === "automatic"
            ? action.now + action.settings.cooldown * 1000
            : null
          : state.deadline;
      return {
        ...state,
        settings: action.settings,
        deadline,
        paused:
          changedProgression && state.phase === "reveal" ? false : state.paused,
      };
    }
  }
}
