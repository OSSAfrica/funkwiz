import { mkdir } from "node:fs/promises";
import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import WebSocket from "ws";

const base = "http://127.0.0.1:3102";
const output = "docs/screenshots";
const questions = [
  {
    prompt: "Which planet is known as the Red Planet?",
    answers: ["Earth", "Mars", "Venus", "Saturn"],
    correctIndex: 1,
    duration: 60,
  },
  {
    prompt: "What keeps the planets in orbit around the Sun?",
    answers: ["Magnetism", "Wind", "Gravity", "Moonlight"],
    correctIndex: 2,
    duration: 30,
  },
  {
    prompt: "Which planet is famous for its beautiful rings?",
    answers: ["Mars", "Mercury", "Earth", "Saturn"],
    correctIndex: 3,
    duration: 30,
  },
  {
    prompt: "What is at the centre of our solar system?",
    answers: ["The Sun", "The Moon", "Earth", "A comet"],
    correctIndex: 0,
    duration: 30,
  },
];

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${output}/${name}.jpg`,
    type: "jpeg",
    quality: 90,
    animations: "disabled",
    scale: "css",
    // This launcher is development-only; production does not render it.
    style:
      'button[aria-label="Open TanStack Devtools"] { visibility: hidden !important; }',
  });
}
async function workspace(page: Page, name: string, data?: unknown) {
  return page.evaluate(
    async ({ name, data }) => {
      const path = "/src/lib/workspaces.functions.ts";
      const api = await import(/* @vite-ignore */ path);
      return data === undefined ? api[name]() : api[name]({ data });
    },
    { name, data },
  );
}
async function post(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.post(path, {
    headers: { origin: base },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

test("capture a fictional classroom through the real application", async ({
  browser,
  playwright,
}) => {
  test.setTimeout(240_000);
  await mkdir(output, { recursive: true });
  const teacher = await browser.newContext({
    baseURL: base,
    viewport: { width: 1440, height: 1200 },
    reducedMotion: "reduce",
  });
  const people: APIRequestContext[] = [];
  const sockets: WebSocket[] = [];
  const mobile = await browser.newContext({
    baseURL: base,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const signup = await teacher.request.post("/api/auth/sign-up/email", {
      headers: {
        origin: base,
        "x-teacher-setup-code":
          "e2e-only-fake-setup-code-never-use-in-production",
      },
      data: {
        name: "Alex Rivera",
        email: "teacher@example.test",
        password: "Only-a-showcase-fixture-password-42!",
      },
    });
    expect(signup.ok(), await signup.text()).toBe(true);
    const page = await teacher.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await workspace(page, "createWorkspace", { name: "Discovery club" });
    const quizzes = await page.evaluate(async (questions) => {
      const path = "/src/lib/quizzes.functions.ts";
      const api = await import(/* @vite-ignore */ path);
      const items = [
        {
          title: "Space explorers",
          description: "A little curiosity. A whole universe to discover.",
          cover: "space",
          questions,
        },
        {
          title: "Our wild world",
          description: "Meet the creatures that make our planet extraordinary.",
          cover: "nature",
          questions: [
            {
              prompt: "Which animal is the tallest in the world?",
              answers: ["Elephant", "Giraffe", "Ostrich", "Kangaroo"],
              correctIndex: 1,
              duration: 25,
            },
            {
              prompt: "What do bees collect from flowers?",
              answers: ["Sand", "Water", "Nectar", "Leaves"],
              correctIndex: 2,
              duration: 20,
            },
          ],
        },
        {
          title: "Around the world",
          description: "Big adventures start with a good question.",
          cover: "world",
          questions: [
            {
              prompt: "Which is the largest ocean on Earth?",
              answers: ["Atlantic", "Indian", "Arctic", "Pacific"],
              correctIndex: 3,
              duration: 30,
            },
            {
              prompt: "On which continent is Ghana?",
              answers: ["Africa", "Asia", "Europe", "South America"],
              correctIndex: 0,
              duration: 20,
            },
          ],
        },
      ];
      const saved = [];
      for (const data of items) saved.push(await api.persistQuiz({ data }));
      await api.shareWorkspaceQuiz({ data: { id: saved[1].id, shared: true } });
      return saved;
    }, questions);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("tab", { name: /My drafts/ }).click();
    await expect(
      page.getByRole("heading", { name: "Space explorers", exact: true }),
    ).toBeVisible();
    await capture(page, "library");
    await page
      .getByRole("button", { name: "Edit Space explorers", exact: true })
      .click();
    await expect(page.getByLabel("Question", { exact: true })).toHaveValue(
      questions[0].prompt,
    );
    await page
      .getByRole("heading", { name: "Make this quiz your own" })
      .click();
    await capture(page, "quiz-editor");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await page
      .getByRole("menuitemradio", { name: "Dark", exact: true })
      .click();
    await capture(page, "dark-library");
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await page
      .getByRole("menuitemradio", { name: "Light", exact: true })
      .click();
    await page.setViewportSize({ width: 1440, height: 1050 });
    const room = await post(teacher.request, "/api/live/rooms", {
      quizId: quizzes[0].id,
      settings: { progression: "manual", display: "both", cooldown: 5 },
    });
    const student = await mobile.newPage();
    await student.goto(`/join?code=${room.code}`);
    await student.getByLabel("Your nickname", { exact: true }).fill("Nova");
    await student
      .getByRole("button", { name: "Join the fun", exact: true })
      .click();
    await expect(
      student.getByText("Waiting for your teacher to start…"),
    ).toBeVisible();
    people.push(mobile.request);
    for (const [index, name] of [
      "Milo",
      "Zuri",
      "Ari",
      "Sage",
      "Remy",
    ].entries()) {
      const request = await playwright.request.newContext({
        baseURL: base,
        extraHTTPHeaders: { "cf-connecting-ip": `192.0.2.${30 + index}` },
      });
      people.push(request);
      await post(request, `/api/live/rooms/${room.code}/join`, {
        nickname: name,
      });
      const state = await request.storageState();
      const cookie = state.cookies
        .map((item) => `${item.name}=${item.value}`)
        .join("; ");
      const socket = new WebSocket(
        `${base.replace("http:", "ws:")}/api/live/rooms/${room.code}/socket`,
        { headers: { origin: base, cookie } },
      );
      sockets.push(socket);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Demo player did not connect.")),
          15_000,
        );
        socket.once("message", () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }
    await page.goto(`/host/${room.code}`);
    await expect(
      page.getByRole("heading", { name: /6 players ready/ }),
    ).toBeVisible();
    await expect(page.locator(".connection-chip")).toContainText("Connected");
    await capture(page, "live-lobby");
    await page
      .getByRole("button", { name: "Show QR code", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
    await capture(page, "qr-code");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    const control = (data: unknown) =>
      post(teacher.request, `/api/live/rooms/${room.code}/control`, data);
    let state = await control({ type: "start" });
    await expect(
      page.getByRole("heading", { name: questions[0].prompt, exact: true }),
    ).toBeVisible();
    await capture(page, "live-question");
    await expect(
      student.getByRole("heading", { name: questions[0].prompt, exact: true }),
    ).toBeVisible();
    await capture(student, "student-mobile");
    for (let index = 0; index < questions.length; index++) {
      if (index)
        state = await control({ type: "next", questionIndex: index - 1 });
      for (const [player, request] of people.entries()) {
        await post(request, `/api/live/rooms/${room.code}/answer`, {
          questionId: state.question.id,
          answer:
            (player + index) % 5 === 0
              ? (questions[index].correctIndex + 1) % 4
              : questions[index].correctIndex,
        });
      }
      await control({ type: "reveal", questionIndex: index });
    }
    await control({ type: "end" });
    await expect(
      page.getByRole("region", { name: "Final podium" }),
    ).toBeVisible();
    await expect(page.locator(".podium-stage .place-1")).toHaveCSS(
      "opacity",
      "1",
    );
    await capture(page, "host-podium");
    await expect(
      student.getByRole("button", { name: "Share my result", exact: true }),
    ).toBeVisible();
    await expect(
      student.locator(".student-score-cards > div").nth(1),
    ).toContainText("of 6 players");
    await capture(student, "student-result");
    const image = student.waitForEvent("download");
    await student
      .getByRole("button", { name: "Share my result", exact: true })
      .click();
    await (await image).saveAs(`${output}/result-card.png`);
    await page.goto(`/reports/${room.sessionId}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Space explorers", exact: true }),
    ).toBeVisible();
    const review = page.locator(".question-review-card").first();
    await expect(review.locator(".review-correct-answer")).toContainText(
      "Correct answer",
    );
    await expect(review.locator(".review-incorrect-answer")).toContainText(
      "Incorrect selection",
    );
    await expect(review.locator(".review-incorrect-answer")).toContainText(
      "Venus",
    );
    await expect(
      review.locator(
        ".review-answer-list > div:not(.review-correct-answer):not(.review-incorrect-answer)",
      ),
    ).toHaveCount(2);
    await capture(page, "report");
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await page
      .getByRole("menuitemradio", { name: "Dark", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const contrast = await review
      .locator(".review-incorrect-answer")
      .evaluate((row) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        const style = getComputedStyle(row);
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = getComputedStyle(
          row.querySelector(".review-answer-track")!,
        ).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        const background = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        ctx.fillStyle = style.color;
        ctx.fillRect(0, 0, 1, 1);
        const foreground = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        const luminance = (rgb: number[]) =>
          rgb.reduce((sum, value, i) => {
            const c = value / 255;
            return (
              sum +
              (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
                [0.2126, 0.7152, 0.0722][i]
            );
          }, 0);
        return (luminance(foreground) + 0.05) / (luminance(background) + 0.05);
      });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await review.scrollIntoViewIfNeeded();
    await capture(page, "report-dark");
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await page
      .getByRole("menuitemradio", { name: "Light", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Download report", exact: true })
      .click();
    await expect(page.getByRole("menuitem", { name: /^PDF/ })).toBeVisible();
    await capture(page, "report-export");
  } finally {
    for (const socket of sockets) socket.close();
    for (const request of people.slice(1)) await request.dispose();
    await mobile.close();
    await teacher.close();
  }
});
