/// <reference types="@cloudflare/vitest-plugin/types" />
import { randomInt } from "node:crypto";
import { beforeAll, expect, test } from "vitest";
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { sampleQuizzes } from "../src/lib/sample-quizzes.server";
import { defaultSettings } from "../src/lib/quiz";

const owner = "workspace-runtime-host";
const workspace = "workspace-runtime-team";
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await env.DB.prepare(
    "INSERT INTO user(id,name,email,created_at,updated_at) VALUES(?,?,?,?,?)",
  )
    .bind(owner, "Host", "workspace-host@example.test", Date.now(), Date.now())
    .run();
  await env.DB.prepare(
    "INSERT INTO organization(id,name,slug,created_at) VALUES(?,?,?,?)",
  )
    .bind(workspace, "Runtime team", "runtime-team", Date.now())
    .run();
});
async function member() {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO member(id,organization_id,user_id,role,created_at) VALUES(?,?,?,'teacher',?)",
  )
    .bind("workspace-host-membership", workspace, owner, Date.now())
    .run();
}
async function room() {
  const code = String(randomInt(100000, 1000000));
  const stub = env.LIVE_ROOMS.getByName(code);
  const id = crypto.randomUUID();
  await stub.initialize(
    id,
    code,
    owner,
    sampleQuizzes[0],
    defaultSettings,
    workspace,
  );
  return { stub, id };
}
test("revoked workspace membership blocks host reads and controls", async () => {
  await member();
  const { stub } = await room();
  expect((await stub.read("host", owner)).ok).toBe(true);
  await env.DB.prepare(
    "DELETE FROM member WHERE user_id = ? AND organization_id = ?",
  )
    .bind(owner, workspace)
    .run();
  expect((await stub.read("host", owner)).ok).toBe(false);
  expect((await stub.control(owner, { type: "end" })).ok).toBe(false);
});
test("removing membership closes already-authorized host sockets", async () => {
  await member();
  const { stub } = await room();
  const response = await stub.fetch(
    new Request("https://room.internal/socket", {
      headers: {
        upgrade: "websocket",
        "x-live-role": "host",
        "x-live-identity": owner,
        "x-live-session-id": "test-session",
        "x-live-session-expiry": String(Date.now() + 60_000),
      },
    }),
  );
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  socket.accept();
  const closed = new Promise<number>((resolve) =>
    socket.addEventListener("close", (event) => resolve(event.code), {
      once: true,
    }),
  );
  await env.DB.prepare(
    "DELETE FROM member WHERE user_id = ? AND organization_id = ?",
  )
    .bind(owner, workspace)
    .run();
  await stub.refreshHostAccess();
  expect(await closed).toBe(4003);
});
test("reports retain their workspace even when the room inserts the final record", async () => {
  await member();
  const { stub, id } = await room();
  expect((await stub.control(owner, { type: "end" })).ok).toBe(true);
  const saved = await env.DB.prepare(
    "SELECT workspace_id, owner_id, report FROM live_session WHERE id = ?",
  )
    .bind(id)
    .first<{ workspace_id: string; owner_id: string; report: string }>();
  expect(saved?.workspace_id).toBe(workspace);
  expect(saved?.owner_id).toBe(owner);
  expect(JSON.parse(saved!.report).id).toBe(id);
});
