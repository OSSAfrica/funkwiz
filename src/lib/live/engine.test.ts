import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoomMeta, advanceRoom, transitionRoom } from "./engine";
import { defaultSettings } from "../quiz";
import { sampleQuizzes } from "../sample-quizzes.server";
import { gameSettings, nickname, rankPlayers } from "./protocol";
import { roomView, type ViewData } from "./view";
const quiz = sampleQuizzes[0];
const make = () =>
  createRoomMeta("session", "123456", "teacher", quiz, defaultSettings, 0);

test("a live room waits for students and starts with its first question duration", () => {
  const room = make();
  assert.equal(room.phase, "lobby");
  assert.equal(room.deadline, null);
  assert.throws(
    () => transitionRoom(room, { type: "start" }, 100, 0),
    /at least one/,
  );
  const started = transitionRoom(room, { type: "start" }, 100, 1);
  assert.equal(started.deadline, 20_100);
  assert.throws(
    () => transitionRoom(started, { type: "start" }, 200, 1),
    /already started/,
  );
});
test("manual reveal has no cooldown and stale advance commands cannot skip questions", () => {
  let room = transitionRoom(make(), { type: "start" }, 0, 2);
  room = advanceRoom(room, 20_000);
  assert.equal(room.phase, "reveal");
  assert.equal(room.deadline, null);
  assert.equal(advanceRoom(room, 90_000), room);
  room = transitionRoom(room, { type: "next", questionIndex: 0 }, 90_000, 2);
  assert.equal(room.index, 1);
  assert.equal(room.deadline, 120_000);
  assert.throws(
    () => transitionRoom(room, { type: "next", questionIndex: 0 }, 90_000, 2),
    /moved on/,
  );
});
test("automatic mode reveals, gives a full cooldown, and finishes after the final reveal", () => {
  let room = {
    ...make(),
    quiz: { ...quiz, questions: [quiz.questions[0]] },
    settings: {
      ...defaultSettings,
      progression: "automatic" as const,
      cooldown: 3,
    },
  };
  room = transitionRoom(room, { type: "start" }, 0, 1) as typeof room;
  room = advanceRoom(room, 25_000) as typeof room; // A delayed alarm never skips the reveal.
  assert.equal(room.phase, "reveal");
  assert.equal(room.deadline, 28_000);
  assert.equal(advanceRoom(room, 27_999), room);
  room = advanceRoom(room, 28_000) as typeof room;
  assert.equal(room.phase, "finished");
  assert.equal(room.index, 0);
});
test("pause/resume preserves time, and switching a paused cooldown to manual cancels it", () => {
  let room = transitionRoom(make(), { type: "start" }, 0, 1);
  room = transitionRoom(room, { type: "pause" }, 5_000, 1);
  assert.equal(room.remainingMs, 15_000);
  assert.equal(advanceRoom(room, 100_000), room);
  room = transitionRoom(room, { type: "resume" }, 100_000, 1);
  assert.equal(room.deadline, 115_000);
  room = transitionRoom(
    room,
    {
      type: "settings",
      settings: { ...defaultSettings, progression: "automatic" },
    },
    101_000,
    1,
  );
  room = transitionRoom(room, { type: "reveal", questionIndex: 0 }, 102_000, 1);
  room = transitionRoom(room, { type: "pause" }, 103_000, 1);
  room = transitionRoom(
    room,
    { type: "settings", settings: defaultSettings },
    104_000,
    1,
  );
  assert.equal(room.paused, false);
  assert.equal(room.deadline, null);
});
test("display changes are accepted between questions and apply at the next boundary", () => {
  let room = transitionRoom(make(), { type: "start" }, 0, 1);
  const settings = { ...defaultSettings, display: "shared" as const };
  assert.throws(
    () => transitionRoom(room, { type: "settings", settings }, 100, 1),
    /between questions/,
  );
  room = advanceRoom(room, 20_000);
  room = transitionRoom(room, { type: "settings", settings }, 21_000, 1);
  assert.equal(room.display, "both");
  room = transitionRoom(room, { type: "next", questionIndex: 0 }, 22_000, 1);
  assert.equal(room.display, "shared");
});
test("public views contain neither future questions nor correctness before reveal", () => {
  const room = transitionRoom(make(), { type: "start" }, 0, 1);
  const data: ViewData = {
    players: [
      { id: "p", nickname: "Curious", score: 0, correctCount: 0, joinedAt: 0 },
    ],
    answers: new Map([["p", 1]]),
    connected: new Set(["p"]),
    hostOnline: true,
    counts: [0, 1, 0, 0],
    revision: 1,
    now: 1000,
  };
  for (const role of ["host", "student"] as const) {
    const view = roomView(room, data, role, "p"),
      text = JSON.stringify(view);
    assert.equal(view.question?.correctIndex, undefined);
    assert.equal(view.question?.counts, undefined);
    assert.equal(view.self?.correct, null);
    assert.equal(view.self?.score, 0);
    assert.equal(text.includes(quiz.questions[1].prompt), false);
    assert.equal(text.includes("ownerId"), false);
    assert.equal(text.includes("token"), false);
  }
  const shared = roomView({ ...room, display: "shared" }, data, "student", "p");
  assert.equal(shared.question?.prompt, null);
  assert.equal(shared.question?.answers, null);
  const reveal = roomView(advanceRoom(room, 20_000), data, "student", "p");
  assert.equal(reveal.question?.correctIndex, 1);
  assert.equal(reveal.self?.correct, true);
});
test("equal accuracy produces equal ranks independent of join order", () => {
  const result = rankPlayers([
    { id: "b", nickname: "B", score: 1000, correctCount: 1, joinedAt: 20 },
    { id: "a", nickname: "A", score: 1000, correctCount: 1, joinedAt: 10 },
    { id: "c", nickname: "C", score: 0, correctCount: 0, joinedAt: 0 },
  ]);
  assert.deepEqual(
    result.map((p) => p.rank),
    [1, 1, 3],
  );
});
test("settings and nicknames reject malformed inputs without changing the room", () => {
  assert.equal(nickname("  Curious   Mind  "), "Curious Mind");
  for (const value of ["", "x", "<script>", "x".repeat(25), null])
    assert.throws(() => nickname(value));
  for (const cooldown of [0, 61, 1.5, "3"])
    assert.throws(() => gameSettings({ ...defaultSettings, cooldown }));
});

test("the final podium includes tied finishers beyond the ten-player preview", () => {
  const room = make();
  const data: ViewData = {
    players: Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      nickname: `Player ${i}`,
      score: 1000,
      correctCount: 1,
      joinedAt: i,
    })),
    answers: new Map(),
    connected: new Set(),
    hostOnline: true,
    counts: [0, 0, 0, 0],
    revision: 1,
    now: 0,
  };
  assert.deepEqual(roomView(room, data, "host").podium, []);
  const view = roomView({ ...room, phase: "finished" }, data, "host");
  assert.equal(view.leaderboard.length, 10);
  assert.equal(view.podium?.length, 12);
  assert.ok(view.podium?.every((player) => player.rank === 1));
});
