import { test, expect } from "@playwright/test";
import WebSocket from "ws";
import type { RoomView } from "../src/lib/live/protocol";
import { hostControl, liveOrigin, openRoom, post, state } from "./live.helpers";

type Bot = {
  cookie: string;
  playerId: string;
  socket: WebSocket | null;
  last: RoomView | null;
  leaked: boolean;
  receivedAt: number;
};
async function parallel<T>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next++;
        await task(items[index], index);
      }
    }),
  );
}
async function connect(bot: Bot, code: string) {
  const socket = new WebSocket(
    `${liveOrigin.replace("http:", "ws:")}/api/live/rooms/${code}/socket`,
    { headers: { origin: liveOrigin, cookie: bot.cookie } },
  );
  bot.socket = socket;
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error("A participant did not receive its initial room state."),
        ),
      15_000,
    );
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString()) as {
        type: string;
        data: RoomView;
      };
      if (message.type !== "state") return;
      bot.last = message.data;
      bot.receivedAt = Date.now();
      if (
        bot.last.phase === "question" &&
        bot.last.question &&
        ("correctIndex" in bot.last.question || "counts" in bot.last.question)
      )
        bot.leaked = true;
      clearTimeout(timeout);
      resolve();
    });
  });
}

test("supports 150 simultaneous students, an answer burst, duplicates, and reconnects", async ({
  request,
  page,
}, info) => {
  test.setTimeout(120_000);
  const { code, sessionId } = await openRoom(request);
  const bots: Bot[] = [];
  const joinStart = Date.now();
  try {
    await parallel(
      Array.from({ length: 150 }, (_, i) => i),
      12,
      async (index) => {
        const response = await fetch(
          `${liveOrigin}/api/live/rooms/${code}/join`,
          {
            method: "POST",
            headers: { origin: liveOrigin, "Content-Type": "application/json" },
            body: JSON.stringify({
              nickname: `Classmate ${String(index + 1).padStart(3, "0")}`,
            }),
          },
        );
        expect(
          response.ok,
          `Student ${index + 1} could not join: ${response.status}`,
        ).toBe(true);
        const data = (await response.json()) as { playerId: string };
        const cookie = response.headers.get("set-cookie")!.split(";")[0];
        const bot: Bot = {
          cookie,
          playerId: data.playerId,
          socket: null,
          last: null,
          leaked: false,
          receivedAt: 0,
        };
        bots[index] = bot;
        await connect(bot, code);
      },
    );
    const joinMilliseconds = Date.now() - joinStart;
    await expect
      .poll(async () => (await state(request, code, true)).connectedCount)
      .toBe(150);
    const started = await hostControl(request, code, { type: "start" });
    await expect
      .poll(() => bots.filter((bot) => bot.last?.phase === "question").length)
      .toBe(150);
    const questionId = started.question!.id;
    const answerStart = Date.now();
    await parallel(bots, 24, async (bot, index) => {
      const response = await fetch(
        `${liveOrigin}/api/live/rooms/${code}/answer`,
        {
          method: "POST",
          headers: {
            origin: liveOrigin,
            cookie: bot.cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ questionId, answer: index % 4 }),
        },
      );
      expect(response.ok, `Answer ${index + 1}: ${response.status}`).toBe(true);
      const snapshot = (await response.json()) as RoomView;
      expect(snapshot.self?.answer).toBe(index % 4);
      expect(snapshot.self?.score).toBe(0);
      expect(snapshot.self?.correct).toBeNull();
    });
    const answerMilliseconds = Date.now() - answerStart;
    for (let index = 0; index < 10; index++) {
      const response = await fetch(
        `${liveOrigin}/api/live/rooms/${code}/answer`,
        {
          method: "POST",
          headers: {
            origin: liveOrigin,
            cookie: bots[index].cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ questionId, answer: (index + 1) % 4 }),
        },
      );
      expect(((await response.json()) as RoomView).self?.answer).toBe(
        index % 4,
      );
    }
    await parallel(bots.slice(0, 15), 5, async (bot) => {
      bot.socket?.close();
      await connect(bot, code);
      expect(bot.last?.self?.id).toBe(bot.playerId);
      expect(bot.last?.self?.answer).not.toBeNull();
    });
    expect((await state(request, code, true)).answeredCount).toBe(150);
    const revealStart = Date.now();
    await hostControl(request, code, { type: "reveal", questionIndex: 0 });
    await expect
      .poll(() => bots.filter((bot) => bot.last?.phase === "reveal").length)
      .toBe(150);
    const revealFanoutMilliseconds = Date.now() - revealStart;
    for (let index = 0; index < bots.length; index++) {
      expect(bots[index].leaked).toBe(false);
      const self = bots[index].last!.self!;
      if (index % 4 === 1) {
        expect(self.score).toBeGreaterThanOrEqual(700);
        expect(self.score).toBeLessThanOrEqual(1000);
        expect(self.correctCount).toBe(1);
      } else expect(self.score).toBe(0);
    }
    const scores = bots
      .map((bot) => bot.last!.self!.score)
      .filter(Boolean)
      .sort((a, b) => b - a);
    expect(scores).toHaveLength(38);
    expect(
      (
        await post(request, `/api/live/rooms/${code}/control`, {
          type: "reveal",
          questionIndex: 0,
        })
      ).status(),
    ).toBe(409);
    const ended = await hostControl(request, code, { type: "end" });
    expect(ended.reportSaved).toBe(true);
    await expect
      .poll(() => bots.filter((bot) => bot.last?.phase === "finished").length)
      .toBe(150);
    await page.goto(`/reports/${sessionId}`);
    await expect(page.locator(".question-review-card").first()).toContainText(
      "38 / 150 correct",
    );
    const metrics = {
      players: 150,
      reconnects: 15,
      duplicateAnswers: 10,
      joinMilliseconds,
      answerMilliseconds,
      revealFanoutMilliseconds,
      correctAnswers: 38,
      environment: "local Workers runtime; simulated WebSocket clients",
    };
    await info.attach("live-capacity-metrics", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    console.log("Local capacity result:", JSON.stringify(metrics));
  } finally {
    for (const bot of bots) bot.socket?.close(1000, "Test complete");
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
  }
});
