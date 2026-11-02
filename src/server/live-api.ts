import { createHash, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { requireWorkspace } from "@/lib/workspace.server";
import { getTeacherSession } from "@/lib/auth.server";
import {
  gameSettings,
  hostAction,
  nickname,
  roomCode,
} from "@/lib/live/protocol";
import { liveSession, quiz as quizTable } from "@/db/schema";
import { sampleQuizzes } from "@/lib/sample-quizzes.server";

const json = (data: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
class HttpFault extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
function unwrap<T>(
  result:
    { ok: true; data: T } | { ok: false; status: number; message: string },
): T {
  if (!result.ok) throw new HttpFault(result.message, result.status);
  return result.data;
}
function validate<T>(parser: (value: unknown) => T, value: unknown): T {
  try {
    return parser(value);
  } catch (cause) {
    throw new HttpFault((cause as Error).message, 400);
  }
}
async function readBody(
  request: Request,
  limit = 4096,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpFault("Send JSON to this endpoint.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpFault("Provide a request body.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new HttpFault("This request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid JSON");
    return body as Record<string, unknown>;
  } catch {
    throw new HttpFault("This request could not be read.", 400);
  }
}
function playerCookie(request: Request, code: string) {
  const prefix = `fq-player-${code}=`;
  const cookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(prefix))
      ?.slice(prefix.length) ?? "";
  return /^[A-Za-z0-9_-]{43}$/.test(cookie) ? cookie : "";
}
async function teacherSession(request: Request) {
  const session = await getTeacherSession(request.headers, false);
  if (!session)
    throw new HttpFault("Sign in to your teacher account to continue.", 401);
  return session;
}
async function allowPublic(request: Request, env: Env) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const key = createHash("sha256").update(ip).digest("hex");
  if (!(await env.LIVE_JOIN_LIMITER.getByName(key).allow()))
    throw new HttpFault(
      "Too many join attempts. Please wait a minute and try again.",
      429,
    );
}
async function createRoom(request: Request, env: Env) {
  const session = await teacherSession(request),
    body = await readBody(request);
  if (typeof body.quizId !== "string")
    throw new HttpFault("Choose a quiz to host.", 400);
  const scope = await requireWorkspace(request.headers);
  const settings = validate(gameSettings, body.settings);
  const db = drizzle(env.DB);
  const stored = await db
    .select()
    .from(quizTable)
    .where(eq(quizTable.id, body.quizId))
    .get();
  if (
    stored &&
    (stored.ownerId !== session.user.id ||
      (stored.workspaceId ?? null) !== scope.workspaceId)
  )
    throw new HttpFault("That quiz is not in your account.", 403);
  const sample = sampleQuizzes.find((q) => q.id === body.quizId);
  const quiz = stored
    ? { ...stored, updatedAt: stored.updatedAt.toISOString() }
    : sample;
  if (!quiz) throw new HttpFault("Save this quiz before hosting it.", 404);
  const active = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM live_session WHERE owner_id = ? AND status IN (?, ?) AND expires_at > ?",
  )
    .bind(session.user.id, "lobby", "active", Date.now())
    .first<{ count: number }>();
  if ((active?.count ?? 0) >= 10)
    throw new HttpFault(
      "Close an existing game before opening another room.",
      409,
    );
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(randomInt(100000, 1000000));
    const id = crypto.randomUUID();
    const created = await env.LIVE_ROOMS.getByName(code).initialize(
      id,
      code,
      session.user.id,
      quiz,
      settings,
      scope.workspaceId,
    );
    if (!created) continue;
    const now = new Date();
    await db.insert(liveSession).values({
      id,
      ownerId: session.user.id,
      workspaceId: scope.workspaceId,
      code,
      title: quiz.title,
      status: "lobby",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    });
    return json({ code, sessionId: id }, 201);
  }
  throw new HttpFault("A room could not be opened. Please try again.", 503);
}
export async function handleLiveRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (
      request.method === "POST" ||
      request.headers.get("upgrade")?.toLowerCase() === "websocket"
    ) {
      if (request.headers.get("origin") !== url.origin)
        throw new HttpFault(
          "Open this game from its original app address.",
          403,
        );
    }
    if (url.pathname === "/api/live/rooms" && request.method === "POST")
      return await createRoom(request, env);
    const match =
      /^\/api\/live\/rooms\/(\d{6})(?:\/(join|answer|control|socket))?$/.exec(
        url.pathname,
      );
    if (!match) throw new HttpFault("Game endpoint not found.", 404);
    const code = roomCode(match[1]),
      operation = match[2],
      role = url.searchParams.get("role") === "host" ? "host" : "student";
    if (
      operation === "socket" &&
      request.headers.get("upgrade")?.toLowerCase() !== "websocket"
    )
      throw new HttpFault("WebSocket required.", 426);
    const room = env.LIVE_ROOMS.getByName(code);
    if (operation === "join" && request.method === "POST") {
      await allowPublic(request, env);
      const body = await readBody(request, 1024),
        name = validate(nickname, body.nickname);
      const joined = unwrap(await room.join(name, playerCookie(request, code)));
      const cookie = `fq-player-${code}=${joined.token}; HttpOnly; SameSite=Lax; Path=/api/live/rooms/${code}; Max-Age=172800${url.protocol === "https:" ? "; Secure" : ""}`;
      return json(
        { code, playerId: joined.playerId, nickname: joined.nickname },
        200,
        { "Set-Cookie": cookie },
      );
    }
    if (operation === "control" && request.method === "POST") {
      const session = await teacherSession(request),
        action = validate(hostAction, await readBody(request));
      return json(unwrap(await room.control(session.user.id, action)));
    }
    if (operation === "answer" && request.method === "POST") {
      const token = playerCookie(request, code);
      if (!token) throw new HttpFault("Join this game to continue.", 401);
      const body = await readBody(request, 1024);
      return json(
        unwrap(await room.answer(token, body.questionId, body.answer)),
      );
    }
    if ((!operation || operation === "socket") && request.method === "GET") {
      let identity: string,
        sessionId = "",
        sessionExpiry = "";
      if (role === "host") {
        const session = await teacherSession(request);
        identity = session.user.id;
        sessionId = session.session.id;
        sessionExpiry = String(session.session.expiresAt.getTime());
      } else {
        identity = playerCookie(request, code);
        if (!identity) throw new HttpFault("Join this game to continue.", 401);
        await allowPublic(request, env);
      }
      if (operation === "socket") {
        return room.fetch(
          new Request("https://room.internal/socket", {
            headers: {
              Upgrade: "websocket",
              "x-live-role": role,
              "x-live-identity": identity,
              "x-live-session-id": sessionId,
              "x-live-session-expiry": sessionExpiry,
            },
          }),
        );
      }
      return json(unwrap(await room.read(role, identity)));
    }
    throw new HttpFault("That method is not supported.", 405);
  } catch (error) {
    if (error instanceof HttpFault)
      return json({ message: error.message }, error.status);
    if (
      error instanceof Error &&
      (error.message.startsWith("Use ") ||
        error.message.startsWith("Choose ") ||
        error.message.startsWith("Enter "))
    )
      return json({ message: error.message }, 400);
    console.error(
      JSON.stringify({ event: "live_api_failed", path: url.pathname }),
    );
    return json(
      {
        message:
          "The game could not be reached. Please reconnect and try again.",
      },
      503,
    );
  }
}
