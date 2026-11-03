import { correctAnswerPoints, scoringFor } from "@/lib/live/scoring";
import { DurableObject } from "cloudflare:workers";
import { createHash, randomBytes } from "node:crypto";
import { advanceRoom, createRoomMeta, transitionRoom } from "@/lib/live/engine";
import {
  gameSettings,
  nickname,
  rankPlayers,
  MAX_PLAYERS,
  type GameReport,
  type HostAction,
  type Player,
  type RoomMeta,
  type RoomRole,
} from "@/lib/live/protocol";
import { roomView, type ViewData } from "@/lib/live/view";
import { parseQuiz } from "@/lib/quiz";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };
type Connection = {
  role: RoomRole;
  playerId?: string;
  sessionId?: string;
  expiresAt?: number;
  window: number;
  messages: number;
};
class GameFault extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export class GameRoom extends DurableObject<Env> {
  #room: RoomMeta | undefined;
  #revision = 0;
  #broadcastPending = false;
  #broadcastEveryone = false;
  #startRecorded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), meta TEXT NOT NULL, revision INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, nickname TEXT NOT NULL, nickname_key TEXT NOT NULL UNIQUE, score INTEGER NOT NULL DEFAULT 0, correct_count INTEGER NOT NULL DEFAULT 0, joined_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS answers (player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, question_index INTEGER NOT NULL, choice INTEGER NOT NULL, awarded INTEGER NOT NULL DEFAULT 0, answered_at INTEGER NOT NULL, submission_order INTEGER, PRIMARY KEY(player_id, question_index));
    `);
    const columns = this.ctx.storage.sql
      .exec<{ name: string }>("PRAGMA table_info(answers)")
      .toArray();
    if (!columns.some((column) => column.name === "submission_order"))
      this.ctx.storage.sql.exec(
        "ALTER TABLE answers ADD COLUMN submission_order INTEGER",
      );
    this.ctx.storage.sql.exec(
      "CREATE INDEX IF NOT EXISTS answers_question_order_idx ON answers(question_index, submission_order)",
    );
    const row = this.ctx.storage.sql
      .exec<{ meta: string; revision: number }>(
        "SELECT meta, revision FROM room WHERE singleton = 1",
      )
      .toArray()[0];
    if (row) {
      this.#room = JSON.parse(row.meta);
      this.#revision = row.revision;
    }
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }
  async initialize(
    id: string,
    code: string,
    ownerId: string,
    quiz: unknown,
    settings: unknown,
    workspaceId: string | null = null,
  ) {
    if (this.#room && this.#room.expiresAt > Date.now()) return false;
    if (this.#room) this.#expire();
    const room = {
      ...createRoomMeta(
        id,
        code,
        ownerId,
        parseQuiz(quiz),
        gameSettings(settings),
        Date.now(),
      ),
      workspaceId,
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO room (singleton, meta, revision) VALUES (1, ?, 1)",
      JSON.stringify(room),
    );
    this.#room = room;
    this.#revision = 1;
    this.#startRecorded = false;
    await this.#schedule();
    return true;
  }
  async join(name: unknown, existingToken: string) {
    return this.#run(async () => {
      const room = this.#requireRoom();
      const existing = this.#playerForToken(existingToken);
      if (existing)
        return {
          playerId: existing.id,
          nickname: existing.nickname,
          token: existingToken,
        };
      if (room.phase !== "lobby")
        throw new GameFault(
          "This game has already started. Rejoin from your original browser, or wait for the next game.",
        );
      const clean = nickname(name);
      if (this.#playerCount() >= MAX_PLAYERS)
        throw new GameFault("This room is full. Please let your teacher know.");
      const duplicate = this.ctx.storage.sql
        .exec(
          "SELECT id FROM players WHERE nickname_key = ?",
          clean.toLowerCase(),
        )
        .toArray()[0];
      if (duplicate)
        throw new GameFault(
          "That nickname is already in the room. Try another one.",
        );
      const id = crypto.randomUUID(),
        token = randomBytes(32).toString("base64url");
      this.ctx.storage.sql.exec(
        "INSERT INTO players (id, token_hash, nickname, nickname_key, joined_at) VALUES (?, ?, ?, ?, ?)",
        id,
        digest(token),
        clean,
        clean.toLowerCase(),
        Date.now(),
      );
      this.#bump();
      this.#queueBroadcast(true);
      return { playerId: id, nickname: clean, token };
    });
  }
  async read(role: RoomRole, identity: string) {
    return this.#run(async () => {
      this.#authorize(role, identity);
      if (role === "host") await this.#assertHostMembership();
      if (this.#advance()) await this.#settle();
      const player =
        role === "student" ? this.#playerForToken(identity) : undefined;
      return roomView(this.#requireRoom(), this.#data(), role, player?.id);
    });
  }
  async control(ownerId: string, action: HostAction) {
    return this.#run(async () => {
      this.#authorize("host", ownerId);
      await this.#assertHostMembership();
      if (this.#advance()) await this.#settle();
      const room = this.#requireRoom();
      let next: RoomMeta;
      try {
        next = transitionRoom(
          room,
          action,
          Date.now(),
          action.type === "start"
            ? this.#data().connected.size
            : this.#playerCount(),
        );
      } catch (error) {
        throw new GameFault((error as Error).message);
      }
      if (action.type === "remove-player") {
        this.ctx.storage.sql.exec(
          "DELETE FROM players WHERE id = ?",
          action.playerId,
        );
        for (const ws of this.ctx.getWebSockets(`player:${action.playerId}`))
          ws.close(4003, "Removed from this lobby");
        this.#bump();
      } else if (next !== room) this.#commit(next);
      await this.#settle();
      return roomView(this.#requireRoom(), this.#data(), "host");
    });
  }
  async answer(token: string, questionId: unknown, choice: unknown) {
    return this.#run(async () => {
      const player = this.#authorize("student", token)!;
      if (this.#advance()) await this.#settle();
      const room = this.#requireRoom();
      const question = room.quiz.questions[room.index];
      if (
        room.phase !== "question" ||
        room.paused ||
        room.deadline === null ||
        Date.now() >= room.deadline ||
        questionId !== question.id
      )
        throw new GameFault(
          "This question is not accepting answers. Your game will refresh.",
        );
      if (!Number.isInteger(choice) || Number(choice) < 0 || Number(choice) > 3)
        throw new GameFault("Choose one of the four answers.", 400);
      const inserted = this.ctx.storage.sql.exec(
        "INSERT INTO answers (player_id, question_index, choice, answered_at, submission_order) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(submission_order), 0) + 1 FROM answers WHERE question_index = ?)) ON CONFLICT(player_id, question_index) DO UPDATE SET choice = excluded.choice, answered_at = excluded.answered_at, submission_order = excluded.submission_order WHERE ? = 1 AND answers.choice != excluded.choice",
        player.id,
        room.index,
        Number(choice),
        Date.now(),
        room.index,
        room.settings.allowAnswerChanges === true ? 1 : 0,
      );
      if (inserted.rowsWritten) {
        this.#bump();
        this.#queueBroadcast(false);
      }
      const view = roomView(room, this.#data(), "student", player.id);
      this.#sendToPlayer(player.id, view);
      return view;
    });
  }
  async fetch(request: Request) {
    try {
      if (request.headers.get("upgrade")?.toLowerCase() !== "websocket")
        return new Response("WebSocket required", { status: 426 });
      const role =
        request.headers.get("x-live-role") === "host" ? "host" : "student";
      const identity = request.headers.get("x-live-identity") ?? "";
      const player = this.#authorize(role, identity);
      if (role === "host") await this.#assertHostMembership();
      if (this.#advance()) await this.#settle();
      const sessionId = request.headers.get("x-live-session-id") ?? undefined;
      const expiresAt = Number(request.headers.get("x-live-session-expiry"));
      if (
        role === "host" &&
        (!sessionId || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
      )
        throw new GameFault("Please sign in again.", 401);
      const tag = role === "host" ? "host" : `player:${player!.id}`;
      const previous = this.ctx.getWebSockets(tag);
      const maxConnections = role === "host" ? 4 : 1;
      if (previous.length >= maxConnections)
        previous[0].close(4001, "Opened in another tab");
      const pair = new WebSocketPair(),
        [client, server] = Object.values(pair);
      const attachment: Connection = {
        role,
        playerId: player?.id,
        sessionId,
        expiresAt,
        window: Date.now(),
        messages: 0,
      };
      this.ctx.acceptWebSocket(server, [tag]);
      server.serializeAttachment(attachment);
      this.#bump();
      server.send(
        JSON.stringify({
          type: "state",
          data: roomView(this.#requireRoom(), this.#data(), role, player?.id),
        }),
      );
      this.#queueBroadcast(true);
      return new Response(null, { status: 101, webSocket: client });
    } catch (error) {
      if (error instanceof GameFault)
        return Response.json(
          { message: error.message },
          { status: error.status },
        );
      throw error;
    }
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const connection = ws.deserializeAttachment() as Connection | undefined;
    if (!connection || typeof message !== "string" || message.length > 512) {
      ws.close(1008, "Invalid message");
      return;
    }
    const now = Date.now();
    if (now - connection.window > 5000) {
      connection.window = now;
      connection.messages = 0;
    }
    connection.messages++;
    ws.serializeAttachment(connection);
    if (connection.messages > 8 || message !== "sync") {
      ws.close(1008, "Use the game controls");
      return;
    }
    if (connection.role === "host") {
      const session = await this.env.DB.prepare(
        "SELECT id FROM session WHERE id = ? AND user_id = ? AND expires_at > ?",
      )
        .bind(connection.sessionId ?? "", this.#room?.ownerId ?? "", now)
        .first();
      if (
        !session ||
        (connection.expiresAt ?? 0) <= now ||
        !(await this.#hostIsMember())
      ) {
        ws.close(4003, "Teacher session ended");
        return;
      }
    }
    if (!this.#room || now >= this.#room.expiresAt) {
      ws.close(4004, "Room expired");
      return;
    }
    if (
      connection.playerId &&
      !this.ctx.storage.sql
        .exec("SELECT id FROM players WHERE id = ?", connection.playerId)
        .toArray()[0]
    ) {
      ws.close(4003, "Player not in this room");
      return;
    }
    if (this.#advance()) await this.#settle();
    ws.send(
      JSON.stringify({
        type: "state",
        data: roomView(
          this.#requireRoom(),
          this.#data(),
          connection.role,
          connection.playerId,
        ),
      }),
    );
  }
  webSocketClose(ws: WebSocket) {
    ws.close();
    if (this.#room) {
      this.#bump();
      this.#queueBroadcast(true);
    }
  }
  webSocketError(ws: WebSocket) {
    ws.close(1011, "Reconnect to continue");
    if (this.#room) {
      this.#bump();
      this.#queueBroadcast(true);
    }
  }
  async alarm() {
    if (!this.#room) return;
    if (Date.now() >= this.#room.expiresAt) {
      this.#expire();
      return;
    }
    this.#advance();
    await this.#settle();
  }
  #requireRoom() {
    if (!this.#room)
      throw new GameFault("No active game was found with that code.", 404);
    if (Date.now() >= this.#room.expiresAt) {
      this.#expire();
      throw new GameFault(
        "This game has expired. Ask your teacher for a new code.",
        410,
      );
    }
    return this.#room;
  }
  #playerForToken(token: string) {
    if (!token || token.length > 128) return undefined;
    return this.ctx.storage.sql
      .exec<{ id: string; nickname: string }>(
        "SELECT id, nickname FROM players WHERE token_hash = ?",
        digest(token),
      )
      .toArray()[0];
  }
  #authorize(role: RoomRole, identity: string) {
    const room = this.#requireRoom();
    if (role === "host") {
      if (identity !== room.ownerId)
        throw new GameFault("Teacher access is required.", 403);
      return undefined;
    }
    const player = this.#playerForToken(identity);
    if (!player) throw new GameFault("Join this game to continue.", 401);
    return player;
  }
  async #hostIsMember() {
    const room = this.#room;
    if (!room?.workspaceId) return true;
    return Boolean(
      await this.env.DB.prepare(
        "SELECT id FROM member WHERE organization_id = ? AND user_id = ? AND role IN ('owner','admin','teacher') LIMIT 1",
      )
        .bind(room.workspaceId, room.ownerId)
        .first(),
    );
  }
  async #assertHostMembership() {
    if (!(await this.#hostIsMember()))
      throw new GameFault("Workspace access has been removed.", 403);
  }
  async refreshHostAccess() {
    if (!(await this.#hostIsMember())) {
      for (const ws of this.ctx.getWebSockets("host"))
        ws.close(4003, "Workspace access removed");
    }
  }
  #playerCount() {
    return this.ctx.storage.sql
      .exec<{ count: number }>("SELECT COUNT(*) AS count FROM players")
      .one().count;
  }
  #bump() {
    this.ctx.storage.sql.exec(
      "UPDATE room SET revision = revision + 1 WHERE singleton = 1",
    );
    this.#revision++;
  }
  #advance() {
    const room = this.#requireRoom(),
      next = advanceRoom(room, Date.now());
    if (next === room) return false;
    this.#commit(next);
    return true;
  }
  #commit(next: RoomMeta) {
    const previous = this.#room;
    this.ctx.storage.transactionSync(() => {
      if (previous?.phase === "question" && next.phase !== "question") {
        const correct = this.ctx.storage.sql
          .exec<{ player_id: string; awarded: number }>(
            "SELECT player_id, awarded FROM answers WHERE question_index = ? AND choice = ? ORDER BY submission_order, answered_at, player_id",
            previous.index,
            previous.quiz.questions[previous.index].correctIndex,
          )
          .toArray();
        const scoring = scoringFor(previous);
        for (const [position, answer] of correct.entries()) {
          if (answer.awarded) continue;
          this.ctx.storage.sql.exec(
            "UPDATE players SET score = score + ?, correct_count = correct_count + 1 WHERE id = ?",
            correctAnswerPoints(position, scoring),
            answer.player_id,
          );
        }
        this.ctx.storage.sql.exec(
          "UPDATE answers SET awarded = 1 WHERE question_index = ?",
          previous.index,
        );
      }
      this.ctx.storage.sql.exec(
        "UPDATE room SET meta = ?, revision = revision + 1 WHERE singleton = 1",
        JSON.stringify(next),
      );
    });
    this.#room = next;
    this.#revision++;
  }
  #data(): ViewData {
    const room = this.#requireRoom();
    const players = this.ctx.storage.sql
      .exec<Player>(
        "SELECT id, nickname, score, correct_count AS correctCount, joined_at AS joinedAt FROM players ORDER BY joined_at, id",
      )
      .toArray();
    const answers = new Map(
      this.ctx.storage.sql
        .exec<{ player_id: string; choice: number }>(
          "SELECT player_id, choice FROM answers WHERE question_index = ? ORDER BY submission_order, answered_at, player_id",
          room.index,
        )
        .toArray()
        .map((row) => [row.player_id, row.choice]),
    );
    const counts = [0, 0, 0, 0];
    for (const choice of answers.values()) counts[choice]++;
    const connected = new Set<string>();
    let hostOnline = false;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const attachment = ws.deserializeAttachment() as Connection;
      if (
        attachment.role === "host" &&
        (attachment.expiresAt ?? 0) > Date.now()
      )
        hostOnline = true;
      if (
        attachment.playerId &&
        players.some((p) => p.id === attachment.playerId)
      )
        connected.add(attachment.playerId);
    }
    return {
      players,
      answers,
      counts,
      connected,
      hostOnline,
      revision: this.#revision,
      now: Date.now(),
    };
  }
  #queueBroadcast(everyone: boolean) {
    this.#broadcastEveryone ||= everyone;
    if (this.#broadcastPending) return;
    this.#broadcastPending = true;
    this.ctx.waitUntil(
      new Promise<void>((resolve) =>
        setTimeout(async () => {
          const all = this.#broadcastEveryone;
          this.#broadcastPending = false;
          this.#broadcastEveryone = false;
          try {
            const hostAllowed = await this.#hostIsMember();
            if (!this.#room) return;
            const data = this.#data();
            for (const ws of this.ctx.getWebSockets()) {
              const connection = ws.deserializeAttachment() as Connection;
              if (!all && connection.role !== "host") continue;
              if (
                connection.role === "host" &&
                ((connection.expiresAt ?? 0) <= Date.now() || !hostAllowed)
              ) {
                ws.close(4003, "Teacher session ended");
                continue;
              }
              try {
                ws.send(
                  JSON.stringify({
                    type: "state",
                    data: roomView(
                      this.#room,
                      data,
                      connection.role,
                      connection.playerId,
                    ),
                  }),
                );
              } catch {
                ws.close(1011, "Reconnect to continue");
              }
            }
          } catch {
            /* An expired room has no listeners to update. */
          } finally {
            resolve();
          }
        }, 50),
      ),
    );
  }
  #sendToPlayer(playerId: string, view: ReturnType<typeof roomView>) {
    for (const ws of this.ctx.getWebSockets(`player:${playerId}`)) {
      try {
        ws.send(JSON.stringify({ type: "state", data: view }));
      } catch {
        ws.close(1011, "Reconnect to continue");
      }
    }
  }
  async #schedule() {
    if (this.#room)
      await this.ctx.storage.setAlarm(
        Math.min(
          this.#room.deadline ?? this.#room.expiresAt,
          this.#room.expiresAt,
        ),
      );
  }
  async #settle() {
    await this.#schedule();
    this.#queueBroadcast(true);
    const room = this.#requireRoom();
    if (
      room.startedAt !== null &&
      !this.#startRecorded &&
      room.phase !== "finished" &&
      room.phase !== "closed"
    ) {
      try {
        await this.env.DB.prepare(
          "UPDATE live_session SET status = ?, started_at = ? WHERE id = ?",
        )
          .bind("active", room.startedAt, room.id)
          .run();
        this.#startRecorded = true;
      } catch {
        console.error(
          JSON.stringify({
            event: "live_session_status_save_failed",
            code: room.code,
          }),
        );
      }
    }
    if (
      (room.phase === "finished" || room.phase === "closed") &&
      !room.reportSaved
    )
      await this.#saveReport();
  }
  #makeReport(): GameReport {
    const room = this.#requireRoom(),
      players = this.#data().players;
    const tally = this.ctx.storage.sql
      .exec<{ question_index: number; choice: number; count: number }>(
        "SELECT question_index, choice, COUNT(*) AS count FROM answers GROUP BY question_index, choice",
      )
      .toArray();
    return {
      id: room.id,
      code: room.code,
      title: room.quiz.title,
      startedAt: room.startedAt,
      endedAt: room.endedAt!,
      playerCount: players.length,
      scoring: scoringFor(room),
      leaderboard: rankPlayers(players),
      questions: room.quiz.questions.map((q, index) => {
        const counts = [0, 0, 0, 0];
        for (const row of tally)
          if (row.question_index === index) counts[row.choice] = row.count;
        return {
          id: q.id,
          prompt: q.prompt,
          answers: q.answers,
          correctIndex: q.correctIndex,
          counts,
          asked: room.startedAt !== null && index <= room.index,
          correct: counts[q.correctIndex],
          answered: counts.reduce((a, b) => a + b, 0),
        };
      }),
    };
  }
  async #saveReport() {
    const room = this.#requireRoom(),
      report = this.#makeReport();
    try {
      await this.env.DB.prepare(
        `INSERT INTO live_session (id, owner_id, workspace_id, code, title, status, created_at, started_at, ended_at, expires_at, report) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, started_at = excluded.started_at, ended_at = excluded.ended_at, expires_at = excluded.expires_at, report = excluded.report`,
      )
        .bind(
          room.id,
          room.ownerId,
          room.workspaceId ?? null,
          room.code,
          room.quiz.title,
          room.phase,
          room.createdAt,
          room.startedAt,
          room.endedAt,
          room.expiresAt,
          JSON.stringify(report),
        )
        .run();
      if (this.#room?.id === room.id) {
        this.#commit({ ...this.#room, reportSaved: true });
        this.#queueBroadcast(true);
      }
    } catch {
      console.error(
        JSON.stringify({ event: "live_report_save_failed", code: room.code }),
      );
      await this.ctx.storage.setAlarm(
        Math.min(Date.now() + 30_000, room.expiresAt),
      );
    }
  }
  #expire() {
    for (const ws of this.ctx.getWebSockets()) ws.close(4004, "Room expired");
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "DELETE FROM answers; DELETE FROM players; DELETE FROM room",
      );
    });
    this.#room = undefined;
    this.#revision = 0;
    this.ctx.waitUntil(this.ctx.storage.deleteAlarm());
  }
  async #run<T>(work: () => T | Promise<T>): Promise<Result<T>> {
    try {
      return { ok: true, data: await work() };
    } catch (error) {
      if (error instanceof GameFault)
        return { ok: false, status: error.status, message: error.message };
      throw error;
    }
  }
}

export class JoinLimiter extends DurableObject<Env> {
  async allow() {
    const now = Date.now();
    const previous = this.ctx.storage.kv.get<{ start: number; count: number }>(
      "window",
    );
    const window =
      !previous || now - previous.start >= 60_000
        ? { start: now, count: 0 }
        : previous;
    if (window.count >= 600) return false;
    this.ctx.storage.kv.put("window", { ...window, count: window.count + 1 });
    await this.ctx.storage.setAlarm(now + 120_000);
    return true;
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
