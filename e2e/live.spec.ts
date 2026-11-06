import { test, expect } from "@playwright/test";
import {
  guest,
  hostControl,
  liveOrigin,
  openRoom,
  post,
  quickQuiz,
  state,
} from "./live.helpers";

test("hosts a real lobby, locks answers, changes visibility, reconnects, and saves a report", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Out of this world",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Host live", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open live lobby", exact: true })
    .click();
  await expect(page).toHaveURL(/\/host\/\d{6}$/);
  const code = new URL(page.url()).pathname.split("/").pop()!;
  const student = await guest(browser, code, `${info.project.name} Ada`);
  try {
    await expect(
      page.getByRole("heading", { name: /1 player ready/ }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/fun-quiz-lobby-${info.project.name}.png`,
      fullPage: true,
    });
    await student.page.screenshot({
      path: `/tmp/fun-quiz-student-lobby-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await expect(
      student.page.getByRole("heading", {
        name: "Which planet is known as the Red Planet?",
      }),
    ).toBeVisible();
    const initial = await state(student.context.request, code);
    expect(initial.question).not.toHaveProperty("correctIndex");
    expect(initial.question).not.toHaveProperty("counts");
    expect(JSON.stringify(initial)).not.toContain("What keeps the planets");
    await student.page
      .getByRole("button", { name: "Mars", exact: true })
      .click();
    await expect(student.page.locator(".answer-feedback")).toContainText(
      "Answer locked in",
    );
    await student.page.reload();
    await student.page.waitForLoadState("networkidle");
    await expect(student.page.locator(".answer-feedback")).toContainText(
      "Answer locked in",
    );
    expect((await state(student.context.request, code)).self?.answer).toBe(1);
    await page
      .getByRole("button", { name: "Reveal answer", exact: true })
      .click();
    await expect(student.page.locator(".answer-feedback")).toContainText(
      /\+[\d,]+ points/,
    );
    await student.page.screenshot({
      path: `/tmp/fun-quiz-student-reveal-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Game settings", exact: true })
      .click();
    await page.getByText("Shared screen", { exact: true }).click();
    await page
      .getByRole("button", { name: "Apply settings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Next question", exact: true })
      .click();
    await expect(
      student.page.getByRole("heading", { name: "Eyes on the shared screen!" }),
    ).toBeVisible();
    const hidden = await state(student.context.request, code);
    expect(hidden.question?.prompt).toBeNull();
    expect(hidden.question?.answers).toBeNull();
    const deadline = hidden.deadline;
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText("Question 2 of 4", { exact: true }),
    ).toBeVisible();
    expect((await state(request, code, true)).deadline).toBe(deadline);
    await page.getByRole("button", { name: "End game", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "End game", exact: true })
      .click();
    await expect(
      student.page.getByRole("heading", { name: "Look at that brain power." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Review game report" }),
    ).toBeVisible();
    const result = await state(request, code, true);
    await page.getByRole("link", { name: "Review game report" }).click();
    await expect(page.locator(".question-review-card").first()).toContainText(
      "1 / 1 correct",
    );
    await page.screenshot({
      path: `/tmp/fun-quiz-report-${info.project.name}.png`,
      fullPage: true,
    });
    await student.page.goto(`${liveOrigin}/reports/${result.sessionId}`);
    await expect(student.page).toHaveURL(/\/login/);
    await student.page.waitForLoadState("networkidle");
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    await student.context.close();
  }
});

test("server alarms advance custom timers automatically and pause survives a host refresh", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(75_000);
  const quizId = await quickQuiz(page, `${info.project.name} Automatic room`);
  const { code } = await openRoom(
    request,
    { progression: "automatic", cooldown: 1, display: "both" },
    quizId,
  );
  const student = await guest(browser, code, `${info.project.name} Grace`);
  try {
    await page.goto(`/host/${code}`);
    await page.waitForLoadState("networkidle");
    // Pause via the API before waiting for browser rendering: a cold client
    // can otherwise consume the entire five-second question before clicking.
    await hostControl(request, code, { type: "start" });
    await hostControl(request, code, { type: "pause" });
    await expect(
      student.page.getByRole("heading", { name: "Which planet is red?" }),
    ).toBeVisible();
    const first = await state(student.context.request, code);
    await expect(
      page.getByRole("button", { name: "Resume", exact: true }),
    ).toBeVisible();
    const paused = await state(request, code, true);
    expect(paused.paused).toBe(true);
    expect(paused.deadline).toBeNull();
    // Deliberately wait beyond the original question's timer to verify server pause.
    await page.waitForTimeout(5500);
    expect((await state(request, code, true)).phase).toBe("question");
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Resume", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await student.page
      .getByRole("button", { name: "Mars", exact: true })
      .click();
    await expect(student.page.locator(".answer-feedback")).toContainText(
      /\+[\d,]+ points/,
      { timeout: 8000 },
    );
    await expect(
      student.page.getByRole("heading", {
        name: "What is at the center of our solar system?",
      }),
    ).toBeVisible({ timeout: 4000 });
    const second = await state(student.context.request, code);
    expect(second.questionIndex).toBe(1);
    expect(second.deadline! - second.serverNow).toBeGreaterThan(3000);
    expect(second.deadline! - second.serverNow).toBeLessThanOrEqual(6000);
    expect(
      (
        await post(student.context.request, `/api/live/rooms/${code}/answer`, {
          questionId: first.question!.id,
          answer: 2,
        })
      ).status(),
    ).toBe(409);
    await expect(
      student.page.getByRole("heading", { name: "Look at that brain power." }),
    ).toBeVisible({ timeout: 10_000 });
    expect(
      (await state(student.context.request, code)).self!.score,
    ).toBeGreaterThanOrEqual(700);
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    await student.context.close();
  }
});

test("protects host controls, preserves first answers, and cancels automatic cooldowns", async ({
  browser,
  request,
}) => {
  const { code } = await openRoom(request, {
    progression: "automatic",
    cooldown: 30,
    display: "both",
  });
  const student = await guest(browser, code, "Curious Hopper");
  const outsider = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: liveOrigin,
  });
  try {
    expect(
      (
        await post(outsider.request, `/api/live/rooms/${code}/join`, {
          nickname: "CURIOUS HOPPER",
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await post(outsider.request, `/api/live/rooms/${code}/join`, {
          nickname: "<script>",
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await post(student.context.request, `/api/live/rooms/${code}/control`, {
          type: "start",
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await outsider.request.get(`/api/live/rooms/${code}?role=host`)
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post(`/api/live/rooms/${code}/control`, {
          headers: { origin: "https://not-your-class.example" },
          data: { type: "start" },
        })
      ).status(),
    ).toBe(403);
    await hostControl(request, code, { type: "start" });
    const initial = await state(student.context.request, code);
    const answer = { questionId: initial.question!.id, answer: 1 };
    expect(
      (
        await post(
          student.context.request,
          `/api/live/rooms/${code}/answer`,
          answer,
        )
      ).ok(),
    ).toBe(true);
    const duplicate = await post(
      student.context.request,
      `/api/live/rooms/${code}/answer`,
      { ...answer, answer: 2 },
    );
    const locked =
      (await duplicate.json()) as import("../src/lib/live/protocol").RoomView;
    expect(locked.self?.answer).toBe(1);
    expect(locked.self?.correct).toBeNull();
    expect(locked.self?.score).toBe(0);
    expect(
      (
        await post(outsider.request, `/api/live/rooms/${code}/join`, {
          nickname: "Too Late",
        })
      ).status(),
    ).toBe(409);
    await hostControl(request, code, { type: "reveal", questionIndex: 0 });
    const manual = await hostControl(request, code, {
      type: "settings",
      settings: { progression: "manual", cooldown: 30, display: "shared" },
    });
    expect(manual.deadline).toBeNull();
    expect(manual.paused).toBe(false);
    await hostControl(request, code, { type: "next", questionIndex: 0 });
    expect(
      (
        await post(request, `/api/live/rooms/${code}/control`, {
          type: "next",
          questionIndex: 0,
        })
      ).status(),
    ).toBe(409);
    expect((await state(request, code, true)).questionIndex).toBe(1);
    expect(
      (
        await post(request, `/api/live/rooms/${code}/control`, {
          type: "settings",
          settings: { progression: "manual", cooldown: 5, display: "both" },
        })
      ).status(),
    ).toBe(409);
    expect(
      (await state(student.context.request, code)).self!.score,
    ).toBeGreaterThanOrEqual(700);
    const resumed = await post(
      student.context.request,
      `/api/live/rooms/${code}/join`,
      { nickname: "Another Name" },
    );
    expect((await resumed.json()).playerId).toBe(initial.self!.id);
  } finally {
    await hostControl(request, code, { type: "end" });
    await student.context.close();
    await outsider.close();
  }
});
