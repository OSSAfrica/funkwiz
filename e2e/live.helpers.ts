import {
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";
import type { GameSettings } from "../src/lib/quiz";
import type { RoomView } from "../src/lib/live/protocol";
export const liveOrigin = "http://127.0.0.1:3100";
export const post = (request: APIRequestContext, path: string, data: unknown) =>
  request.post(path, { data, headers: { origin: liveOrigin } });
export async function openRoom(
  request: APIRequestContext,
  settings: GameSettings = {
    progression: "manual",
    cooldown: 5,
    display: "both",
  },
  quizId = "example-space",
) {
  const response = await post(request, "/api/live/rooms", { quizId, settings });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as { code: string; sessionId: string };
}
export async function hostControl(
  request: APIRequestContext,
  code: string,
  action: unknown,
) {
  const response = await post(
    request,
    `/api/live/rooms/${code}/control`,
    action,
  );
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as RoomView;
}
export async function guest(browser: Browser, code: string, name: string) {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: liveOrigin,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${liveOrigin}/join?code=${code}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Game code", { exact: true })).toHaveValue(code);
  await page.getByLabel("Your nickname", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Join the fun", exact: true }).click();
  await expect(
    page.getByText("Waiting for your teacher to start…"),
  ).toBeVisible();
  await expect(page.locator(".connection-chip")).toContainText("Connected");
  expect(
    (await context.cookies()).some((cookie) =>
      cookie.name.includes("better-auth"),
    ),
  ).toBe(false);
  return { context, page };
}
export async function state(
  request: APIRequestContext,
  code: string,
  host = false,
) {
  const response = await request.get(
    `/api/live/rooms/${code}${host ? "?role=host" : ""}`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as RoomView;
}
export async function quickQuiz(page: Page, title: string, duration = 5) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  return page.evaluate(
    async ({ title, duration }) => {
      const path = "/src/lib/quizzes.functions.ts";
      const api = await import(/* @vite-ignore */ path);
      const quiz = await api.persistQuiz({
        data: {
          title,
          questions: [
            {
              prompt: "Which planet is red?",
              answers: ["Earth", "Mars", "Venus", "Saturn"],
              correctIndex: 1,
              duration,
            },
            {
              prompt: "What is at the center of our solar system?",
              answers: ["Earth", "The Moon", "The Sun", "Mars"],
              correctIndex: 2,
              duration: duration + 1,
            },
          ],
        },
      });
      return quiz.id as string;
    },
    { title, duration },
  );
}
