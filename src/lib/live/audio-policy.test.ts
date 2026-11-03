import { test } from "node:test";
import assert from "node:assert/strict";
import { audioCues, audioScene, musicSceneLevel } from "./audio-policy";
import type { RoomView } from "./protocol";
const room: RoomView = {
  code: "123456",
  sessionId: "session",
  title: "Audio test",
  phase: "question",
  revision: 1,
  serverNow: 1000,
  role: "student",
  questionIndex: 0,
  questionCount: 2,
  settings: { progression: "manual", display: "both", cooldown: 5 },
  display: "both",
  deadline: 21000,
  paused: false,
  remainingMs: 20000,
  expiresAt: 90000,
  playerCount: 1,
  connectedCount: 1,
  hostOnline: true,
  answeredCount: 0,
  roster: [],
  leaderboard: [],
  question: { id: "one", prompt: "Question?", answers: ["a", "b", "c", "d"] },
  self: {
    id: "student",
    nickname: "Ada",
    score: 0,
    rank: 1,
    correctCount: 0,
    answer: null,
    correct: null,
  },
  reportSaved: false,
};
test("opening or reconnecting does not replay past result effects", () => {
  assert.deepEqual(audioCues(null, room), []);
  assert.deepEqual(audioCues(room, { ...room }), []);
  const reveal = {
    ...room,
    phase: "reveal" as const,
    self: { ...room.self!, correct: true },
  };
  assert.deepEqual(audioCues(null, reveal), []);
  assert.deepEqual(audioCues(reveal, { ...reveal }), []);
  assert.deepEqual(audioCues(room, { ...reveal, sessionId: "different" }), []);
});
test("question and confirmed selection cues never disclose correctness", () => {
  const selected = { ...room, self: { ...room.self!, answer: 0 } };
  assert.deepEqual(
    audioCues(selected, { ...selected, self: { ...selected.self, answer: 1 } }),
    ["selected"],
  );
  assert.deepEqual(audioCues(selected, { ...selected }), []);
  assert.deepEqual(audioCues({ ...room, phase: "lobby" }, room), ["question"]);
  assert.deepEqual(
    audioCues(room, { ...room, self: { ...room.self!, answer: 1 } }),
    ["selected"],
  );
  assert.deepEqual(audioCues({ ...room, paused: true }, room), []);
});
test("positive and negative cues require a revealed server result; hosts and unanswered players remain neutral", () => {
  for (const [correct, cue] of [
    [true, "correct"],
    [false, "incorrect"],
    [null, "reveal"],
  ] as const)
    assert.deepEqual(
      audioCues(room, {
        ...room,
        phase: "reveal",
        self: { ...room.self!, correct },
      }),
      [cue],
    );
  assert.deepEqual(
    audioCues(room, { ...room, phase: "reveal", role: "host", self: null }),
    ["reveal"],
  );
  assert.deepEqual(audioCues(room, { ...room, phase: "finished" }), [
    "finished",
  ]);
});
test("audio follows connection, visibility and pause state and converts the server clock", () => {
  assert.equal(audioScene(room, 500, true, true).deadline, 20500);
  assert.equal(audioScene(room, 0, false, true).audible, false);
  assert.equal(audioScene(room, 0, true, false).audible, false);
  assert.equal(
    audioScene({ ...room, paused: true }, 0, true, true).audible,
    false,
  );
  assert.equal(
    audioScene({ ...room, phase: "closed" }, 0, true, true).audible,
    false,
  );
});
test("the question bed is quieter while lobby and results keep the music playing", () => {
  assert.ok(musicSceneLevel("question") < musicSceneLevel("reveal"));
  assert.equal(musicSceneLevel("question") / musicSceneLevel("lobby"), 0.36);
  assert.equal(musicSceneLevel("finished"), 1);
  assert.equal(musicSceneLevel("closed"), 0);
});
