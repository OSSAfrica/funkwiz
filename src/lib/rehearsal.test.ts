import { test } from "node:test";
import assert from "node:assert/strict";
import { beginRehearsal, rehearsalReducer as reduce } from "./rehearsal";
import { defaultSettings } from "./quiz";
import { sampleQuizzes } from "./sample-quizzes";
const quiz = sampleQuizzes[0];
const automatic = {
  ...defaultSettings,
  progression: "automatic" as const,
  cooldown: 5,
};

test("manual progression reveals on expiry and waits without a cooldown", () => {
  let state = beginRehearsal(quiz, defaultSettings, 0);
  state = reduce(state, { type: "tick", now: 20_000 });
  assert.equal(state.phase, "reveal");
  assert.equal(state.deadline, null);
  state = reduce(state, { type: "tick", now: 100_000 });
  assert.equal(state.index, 0);
  state = reduce(state, { type: "next", now: 100_000 });
  assert.equal(state.index, 1);
  assert.equal(state.deadline, 130_000); // Different question, different time.
});
test("automatic progression gives a full cooldown before the next question", () => {
  let state = beginRehearsal(quiz, automatic, 0);
  state = reduce(state, { type: "tick", now: 20_000 });
  assert.equal(state.phase, "reveal");
  assert.equal(state.deadline, 25_000);
  state = reduce(state, { type: "tick", now: 24_999 });
  assert.equal(state.index, 0);
  state = reduce(state, { type: "tick", now: 25_000 });
  assert.equal(state.index, 1);
  assert.equal(state.phase, "question");
  assert.equal(state.deadline, 55_000);
});
test("pause and resume preserve remaining question time", () => {
  let state = beginRehearsal(quiz, defaultSettings, 0);
  state = reduce(state, { type: "pause", now: 7_000 });
  assert.equal(state.remaining, 13_000);
  state = reduce(state, { type: "tick", now: 50_000 });
  assert.equal(state.phase, "question");
  state = reduce(state, { type: "pause", now: 50_000 });
  assert.equal(state.deadline, 63_000);
});
test("switching to manual cancels a paused cooldown and allows manual advance", () => {
  let state = reduce(beginRehearsal(quiz, automatic, 0), {
    type: "tick",
    now: 20_000,
  });
  state = reduce(state, { type: "pause", now: 21_000 });
  state = reduce(state, {
    type: "settings",
    now: 22_000,
    settings: defaultSettings,
  });
  assert.equal(state.paused, false);
  assert.equal(state.deadline, null);
  state = reduce(state, { type: "tick", now: 99_000 });
  assert.equal(state.index, 0);
});
test("display changes apply only at the next question boundary", () => {
  let state = beginRehearsal(quiz, defaultSettings, 0);
  state = reduce(state, {
    type: "settings",
    now: 1_000,
    settings: { ...defaultSettings, display: "shared" },
  });
  assert.equal(state.display, "both");
  state = reduce(state, { type: "reveal", now: 2_000 });
  state = reduce(state, { type: "next", now: 3_000 });
  assert.equal(state.display, "shared");
});
test("automatic mode finishes after the final reveal without an extra question", () => {
  const single = { ...quiz, questions: [quiz.questions[0]] };
  let state = beginRehearsal(single, automatic, 0);
  state = reduce(state, { type: "tick", now: 20_000 });
  assert.equal(state.phase, "reveal");
  state = reduce(state, { type: "tick", now: 25_000 });
  assert.equal(state.phase, "finished");
  assert.equal(state.index, 0);
});
test("locks the first practice answer and ignores answers after reveal", () => {
  let state = beginRehearsal(quiz, defaultSettings, 0);
  state = reduce(state, { type: "answer", answer: 1 });
  state = reduce(state, { type: "answer", answer: 2 });
  assert.equal(state.answer, 1);
  state = reduce(state, { type: "reveal", now: 1 });
  state = reduce(state, { type: "answer", answer: 3 });
  assert.equal(state.answer, 1);
});
