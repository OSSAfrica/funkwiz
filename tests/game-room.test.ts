/// <reference types="@cloudflare/vitest-plugin/types" />
import { randomInt } from "node:crypto";
import { afterEach, beforeAll, expect, test } from "vitest";
import {
  applyD1Migrations,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import type { D1Migration } from "@cloudflare/vitest-plugin";
import { sampleQuizzes } from "../src/lib/sample-quizzes.server";
import { defaultSettings } from "../src/lib/quiz";
import type { RoomMeta, RoomView } from "../src/lib/live/protocol";

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
const sockets: WebSocket[] = [];
const owner = "runtime-teacher";
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(owner, "Teacher", "teacher@example.test", Date.now(), Date.now())
    .run();
});
afterEach(() => {
  for (const ws of sockets.splice(0)) ws.close(1000, "Test complete");
});
async function room(legacy = true) {
  const code = String(randomInt(100000, 1000000));
  const stub = env.LIVE_ROOMS.getByName(code);
  expect(
    await stub.initialize(
      crypto.randomUUID(),
      code,
      owner,
      sampleQuizzes[0],
      defaultSettings,
    ),
  ).toBe(true);
  if (legacy)
    await rewrite(stub, {
      scoring: { type: "answer-order", points: [1000, 900, 800, 700] },
    });
  const joined = await stub.join("Curious Ada", "");
  if (!joined.ok) throw new Error(joined.message);
  const response = await stub.fetch(
    new Request("https://room.internal/socket", {
      headers: {
        upgrade: "websocket",
        "x-live-role": "student",
        "x-live-identity": joined.data.token,
      },
    }),
  );
  expect(response.status).toBe(101);
  const client = response.webSocket!;
  client.accept();
  sockets.push(client);
  return { stub, code, token: joined.data.token, client };
}
async function rewrite(
  stub: ReturnType<typeof env.LIVE_ROOMS.getByName>,
  patch: Partial<RoomMeta>,
) {
  await runInDurableObject(stub, (_instance, state) => {
    const row = state.storage.sql
      .exec<{ meta: string }>("SELECT meta FROM room WHERE singleton = 1")
      .one();
    state.storage.sql.exec(
      "UPDATE room SET meta = ? WHERE singleton = 1",
      JSON.stringify({ ...JSON.parse(row.meta), ...patch }),
    );
  });
  await evictDurableObject(stub);
}

test("room state, WebSocket identity, and locked answers survive eviction", async () => {
  const { stub, token, client } = await room();
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  expect((await stub.answer(token, start.data.question!.id, 1)).ok).toBe(true);
  const deadline = start.data.deadline;
  await evictDurableObject(stub);
  const restored = await stub.read("student", token);
  if (!restored.ok) throw new Error(restored.message);
  expect(restored.data.self?.answer).toBe(1);
  expect(restored.data.self?.score).toBe(0);
  expect(restored.data.deadline).toBe(deadline);
  const message = new Promise<RoomView>((resolve) => {
    client.addEventListener(
      "message",
      (event) => {
        const message = JSON.parse(String(event.data));
        if (message.type === "state") resolve(message.data);
      },
      { once: true },
    );
  });
  client.send("sync");
  expect((await message).self?.id).toBe(restored.data.self?.id);
});
test("an alarm reveals and awards points exactly once after a restart", async () => {
  const { stub, token } = await room();
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  await stub.answer(token, start.data.question!.id, 1);
  await stub.answer(token, start.data.question!.id, 2);
  await rewrite(stub, { deadline: Date.now() - 1 });
  await runDurableObjectAlarm(stub);
  const revealed = await stub.read("student", token);
  if (!revealed.ok) throw new Error(revealed.message);
  expect(revealed.data.phase).toBe("reveal");
  expect(revealed.data.question?.correctIndex).toBe(1);
  expect(revealed.data.self?.answer).toBe(1);
  expect(revealed.data.self?.score).toBe(1000);
  await evictDurableObject(stub);
  await runDurableObjectAlarm(stub);
  const again = await stub.read("student", token);
  if (!again.ok) throw new Error(again.message);
  expect(again.data.self?.score).toBe(1000);
});
test("expiry removes room identities while keeping the saved teacher report", async () => {
  const { stub, token, code } = await room();
  await stub.control(owner, { type: "start" });
  const ended = await stub.control(owner, { type: "end" });
  if (!ended.ok) throw new Error(ended.message);
  expect(ended.data.reportSaved).toBe(true);
  await rewrite(stub, { expiresAt: Date.now() - 1 });
  await runDurableObjectAlarm(stub);
  const expired = await stub.read("student", token);
  expect(expired.ok).toBe(false);
  const saved = await env.DB.prepare(
    "SELECT report FROM live_session WHERE id = ?",
  )
    .bind(ended.data.sessionId)
    .first<{ report: string }>();
  expect(JSON.parse(saved!.report).playerCount).toBe(1);
  expect(
    await stub.initialize(
      crypto.randomUUID(),
      code,
      owner,
      sampleQuizzes[0],
      defaultSettings,
    ),
  ).toBe(true);
  const oldIdentity = await stub.read("student", token);
  expect(oldIdentity.ok).toBe(false);
});
test("a participant WebSocket cannot send host commands", async () => {
  const { stub, client } = await room();
  const closed = new Promise<number>((resolve) =>
    client.addEventListener("close", (event) => resolve(event.code), {
      once: true,
    }),
  );
  client.send(JSON.stringify({ type: "start" }));
  expect(await closed).toBe(1008);
  const state = await stub.read("host", owner);
  if (!state.ok) throw new Error(state.message);
  expect(state.data.phase).toBe("lobby");
});

test("correct submission tiers survive identical timestamps, retries and eviction, then reset", async () => {
  const { stub, token } = await room();
  const tokens = [token];
  for (let i = 0; i < 5; i++) {
    const joined = await stub.join(`Learner ${i}`, "");
    if (!joined.ok) throw new Error(joined.message);
    tokens.push(joined.data.token);
  }
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  const question = start.data.question!.id;
  for (const [i, identity] of tokens.entries()) {
    const answer = await stub.answer(identity, question, i === 0 ? 0 : 1);
    if (!answer.ok) throw new Error(answer.message);
    expect(answer.data.self?.score).toBe(0);
    expect(answer.data.self?.pointsEarned).toBeNull();
    expect(answer.data.self?.correctOrder).toBeNull();
  }
  await stub.answer(tokens[1], question, 0);
  await runInDurableObject(stub, (_instance, state) => {
    state.storage.sql.exec("UPDATE answers SET answered_at = 42");
  });
  await evictDurableObject(stub);
  await stub.control(owner, { type: "reveal", questionIndex: 0 });
  const expected = [0, 1000, 900, 800, 700, 700];
  for (const [i, identity] of tokens.entries()) {
    const revealed = await stub.read("student", identity);
    if (!revealed.ok) throw new Error(revealed.message);
    expect(revealed.data.self?.score).toBe(expected[i]);
    expect(revealed.data.self?.pointsEarned).toBe(expected[i]);
    expect(revealed.data.self?.correctOrder).toBe(i || null);
  }
  await evictDurableObject(stub);
  await stub.control(owner, { type: "reveal", questionIndex: 0 });
  const next = await stub.control(owner, { type: "next", questionIndex: 0 });
  if (!next.ok) throw new Error(next.message);
  await stub.answer(
    tokens[2],
    next.data.question!.id,
    sampleQuizzes[0].questions[1].correctIndex,
  );
  await stub.control(owner, { type: "end" });
  const ended = await stub.read("student", tokens[2]);
  if (!ended.ok) throw new Error(ended.message);
  expect(ended.data.self?.score).toBe(1900);
  expect(ended.data.self?.correctCount).toBe(2);
  const saved = await env.DB.prepare(
    "SELECT report FROM live_session WHERE id = ?",
  )
    .bind(ended.data.sessionId)
    .first<{ report: string }>();
  const report = JSON.parse(saved!.report);
  expect(report.scoring).toEqual({
    type: "answer-order",
    points: [1000, 900, 800, 700],
  });
  expect(report.pointsPerCorrect).toBeUndefined();
});

test("legacy rooms migrate the answer table and retain flat points", async () => {
  const { stub, token } = await room();
  const second = await stub.join("Second learner", "");
  if (!second.ok) throw new Error(second.message);
  await runInDurableObject(stub, (_instance, state) => {
    const meta = JSON.parse(
      state.storage.sql.exec<{ meta: string }>("SELECT meta FROM room").one()
        .meta,
    );
    delete meta.scoring;
    state.storage.sql.exec("UPDATE room SET meta = ?", JSON.stringify(meta));
    state.storage.sql.exec("DROP INDEX answers_question_order_idx");
    state.storage.sql.exec("ALTER TABLE answers DROP COLUMN submission_order");
    state.storage.sql.exec("ALTER TABLE answers DROP COLUMN response_ms");
    state.storage.sql.exec("ALTER TABLE players DROP COLUMN speed_cost");
  });
  await evictDurableObject(stub);
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  await stub.answer(token, start.data.question!.id, 1);
  await stub.answer(second.data.token, start.data.question!.id, 1);
  await stub.control(owner, { type: "reveal", questionIndex: 0 });
  const restored = await stub.read("student", second.data.token);
  if (!restored.ok) throw new Error(restored.message);
  expect(restored.data.self?.score).toBe(1000);
  expect(restored.data.self?.pointsEarned).toBe(1000);
  expect(restored.data.scoring).toEqual({
    type: "flat",
    pointsPerCorrect: 1000,
  });
});

test("editable answers use final choice order, survive eviction and preserve idempotent retries", async () => {
  const { stub, token } = await room();
  const settings = { ...defaultSettings, allowAnswerChanges: true };
  expect((await stub.control(owner, { type: "settings", settings })).ok).toBe(
    true,
  );
  const others = [];
  for (const name of ["Early Correct", "Later Correct", "Fourth Correct"]) {
    const joined = await stub.join(name, "");
    if (!joined.ok) throw new Error(joined.message);
    others.push(joined.data.token);
  }
  const started = await stub.control(owner, { type: "start" });
  if (!started.ok) throw new Error(started.message);
  const question = started.data.question!.id;
  await stub.answer(token, question, 0);
  await stub.answer(others[0], question, 1);
  await stub.answer(token, question, 1);
  await stub.answer(others[1], question, 1);
  await stub.answer(token, question, 0);
  const final = await stub.answer(token, question, 1);
  if (!final.ok) throw new Error(final.message);
  expect(final.data.self?.correct).toBeNull();
  expect(final.data.self?.pointsEarned).toBeNull();
  await stub.answer(others[2], question, 1);
  const before = await stub.read("student", token);
  await stub.answer(token, question, 1);
  const duplicate = await stub.read("student", token);
  if (!before.ok || !duplicate.ok) throw new Error("Missing player state");
  expect(duplicate.data.revision).toBe(before.data.revision);
  expect(duplicate.data.answeredCount).toBe(4);
  await runInDurableObject(stub, (_instance, state) => {
    state.storage.sql.exec("UPDATE answers SET answered_at = 42");
  });
  await evictDurableObject(stub);
  const restored = await stub.read("student", token);
  if (!restored.ok) throw new Error(restored.message);
  expect(restored.data.self?.answer).toBe(1);
  expect(restored.data.settings.allowAnswerChanges).toBe(true);
  await stub.control(owner, { type: "reveal", questionIndex: 0 });
  for (const [identity, points, order] of [
    [others[0], 1000, 1],
    [others[1], 900, 2],
    [token, 800, 3],
    [others[2], 700, 4],
  ] as const) {
    const view = await stub.read("student", identity);
    if (!view.ok) throw new Error(view.message);
    expect(view.data.self?.pointsEarned).toBe(points);
    expect(view.data.self?.correctOrder).toBe(order);
  }
  expect((await stub.answer(token, question, 0)).ok).toBe(false);
  const end = await stub.control(owner, { type: "end" });
  if (!end.ok) throw new Error(end.message);
  const row = await env.DB.prepare(
    "SELECT report FROM live_session WHERE id = ?",
  )
    .bind(end.data.sessionId)
    .first<{ report: string }>();
  const report = JSON.parse(row!.report);
  expect(report.questions[0].counts).toEqual([0, 4, 0, 0]);
  expect(report.questions[0].answered).toBe(4);
});

test("answer editing rejects paused, expired and stale questions and can be disabled for the next question", async () => {
  const { stub, token } = await room();
  expect(
    (
      await stub.control(owner, {
        type: "settings",
        settings: { ...defaultSettings, allowAnswerChanges: true },
      })
    ).ok,
  ).toBe(true);
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  const first = start.data.question!.id;
  await stub.answer(token, first, 0);
  expect(
    (await stub.control(owner, { type: "settings", settings: defaultSettings }))
      .ok,
  ).toBe(false);
  await stub.control(owner, { type: "pause" });
  expect((await stub.answer(token, first, 1)).ok).toBe(false);
  await stub.control(owner, { type: "resume" });
  await rewrite(stub, { deadline: Date.now() - 1 });
  expect((await stub.answer(token, first, 1)).ok).toBe(false);
  const reveal = await stub.read("student", token);
  if (!reveal.ok) throw new Error(reveal.message);
  expect(reveal.data.self?.answer).toBe(0);
  expect(reveal.data.self?.score).toBe(0);
  expect(
    (await stub.control(owner, { type: "settings", settings: defaultSettings }))
      .ok,
  ).toBe(true);
  const next = await stub.control(owner, { type: "next", questionIndex: 0 });
  if (!next.ok) throw new Error(next.message);
  expect(next.data.settings.allowAnswerChanges).toBe(false);
  expect((await stub.answer(token, first, 1)).ok).toBe(false);
  await stub.answer(token, next.data.question!.id, 0);
  const locked = await stub.answer(token, next.data.question!.id, 1);
  if (!locked.ok) throw new Error(locked.message);
  expect(locked.data.self?.answer).toBe(0);
});

test("accuracy-first room records final active time, ignores paused time and survives eviction", async () => {
  const { stub, token } = await room(false);
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  expect(start.data.scoring?.type).toBe("accuracy-first");
  await rewrite(stub, {
    paused: true,
    deadline: null,
    remainingMs: 15000,
    startedAt: Date.now() - 100000,
  });
  await stub.control(owner, { type: "resume" });
  const answer = await stub.answer(token, start.data.question!.id, 1);
  expect(answer.ok).toBe(true);
  const before = await runInDurableObject(
    stub,
    (_instance, state) =>
      state.storage.sql
        .exec<{ response_ms: number }>("SELECT response_ms FROM answers")
        .one().response_ms,
  );
  expect(before).toBeGreaterThanOrEqual(5000);
  expect(before).toBeLessThan(5500);
  await stub.answer(token, start.data.question!.id, 1);
  expect(
    await runInDurableObject(
      stub,
      (_instance, state) =>
        state.storage.sql
          .exec<{ response_ms: number }>("SELECT response_ms FROM answers")
          .one().response_ms,
    ),
  ).toBe(before);
  await evictDurableObject(stub);
  await stub.control(owner, { type: "reveal", questionIndex: 0 });
  const revealed = await stub.read("student", token);
  if (!revealed.ok) throw new Error(revealed.message);
  expect(revealed.data.self?.pointsEarned).toBe(revealed.data.self?.score);
  expect(revealed.data.self!.score).toBeGreaterThanOrEqual(917);
  expect(revealed.data.self!.score).toBeLessThanOrEqual(925);
  expect(revealed.data.leaderboard[0].correctCount).toBe(1);
  await stub.control(owner, { type: "end" });
  const again = await stub.read("student", token);
  if (!again.ok) throw new Error(again.message);
  expect(again.data.self?.score).toBe(revealed.data.self?.score);
});

test("accuracy-first ranking persists to the report even when the winner has fewer points", async () => {
  const { stub, token } = await room(false);
  const second = await stub.join("Fast Ben", "");
  if (!second.ok) throw new Error(second.message);
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  await runInDurableObject(stub, (_instance, state) => {
    state.storage.sql.exec(
      "UPDATE players SET correct_count=8,score=5600,speed_cost=8000000 WHERE nickname='Curious Ada'",
    );
    state.storage.sql.exec(
      "UPDATE players SET correct_count=7,score=7000,speed_cost=0 WHERE nickname='Fast Ben'",
    );
  });
  await evictDurableObject(stub);
  await stub.control(owner, { type: "end" });
  const result = await stub.read("student", token);
  if (!result.ok) throw new Error(result.message);
  expect(result.data.self?.rank).toBe(1);
  expect(result.data.leaderboard.map((p) => p.nickname)).toEqual([
    "Curious Ada",
    "Fast Ben",
  ]);
  const row = await env.DB.prepare(
    "SELECT report FROM live_session WHERE id = ?",
  )
    .bind(result.data.sessionId)
    .first<{ report: string }>();
  const report = JSON.parse(row!.report);
  expect(report.scoring.type).toBe("accuracy-first");
  expect(report.leaderboard[0]).toMatchObject({
    nickname: "Curious Ada",
    score: 5600,
    correctCount: 8,
    rank: 1,
  });
});

test("editing a new game's answer replaces its timing; identical retries preserve the final time", async () => {
  const { stub, token } = await room(false);
  await stub.control(owner, {
    type: "settings",
    settings: { ...defaultSettings, allowAnswerChanges: true },
  });
  const start = await stub.control(owner, { type: "start" });
  if (!start.ok) throw new Error(start.message);
  await stub.answer(token, start.data.question!.id, 0);
  await rewrite(stub, { deadline: Date.now() + 10000 });
  await stub.answer(token, start.data.question!.id, 1);
  const elapsed = await runInDurableObject(
    stub,
    (_instance, state) =>
      state.storage.sql
        .exec<{ response_ms: number }>("SELECT response_ms FROM answers")
        .one().response_ms,
  );
  expect(elapsed).toBeGreaterThanOrEqual(10000);
  await evictDurableObject(stub);
  await stub.answer(token, start.data.question!.id, 1);
  const after = await runInDurableObject(
    stub,
    (_instance, state) =>
      state.storage.sql
        .exec<{ response_ms: number }>("SELECT response_ms FROM answers")
        .one().response_ms,
  );
  expect(after).toBe(elapsed);
  await stub.control(owner, { type: "reveal", questionIndex: 0 });
  const result = await stub.read("student", token);
  if (!result.ok) throw new Error(result.message);
  expect(result.data.self?.correctCount).toBe(1);
  expect(result.data.self!.score).toBeGreaterThanOrEqual(842);
  expect(result.data.self!.score).toBeLessThanOrEqual(850);
});
