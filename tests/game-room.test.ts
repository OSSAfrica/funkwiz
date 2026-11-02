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
async function room() {
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
