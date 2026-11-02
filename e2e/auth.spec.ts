import { test, expect } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });

test("private workspace redirects to login and hides Google with partial credentials", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Welcome back, quiz maker." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("or use your email", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("PERSONAL MODE", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Private setup code", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Your setup code is not needed for normal login.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/fun-quiz-sign-in-${info.project.name}.png`,
    fullPage: true,
  });
});
test("rejects nonteacher registration and requests without a private setup code", async ({
  request,
}) => {
  const blocked = await request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {
      name: "Outsider",
      email: "outsider@example.test",
      password: "Only-a-local-test-password-42!",
    },
  });
  expect(blocked.status()).toBe(403);
  const claimed = await request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {
      name: "Teacher",
      email: "teacher@example.test",
      password: "Only-a-local-test-password-42!",
    },
  });
  expect(claimed.status()).toBe(403);
});
test("signs in with email and signs out", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email address").fill("teacher@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Only-a-local-test-password-42!");
  await page.getByRole("button", { name: "Let’s go", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Your quiz collection/ }),
  ).toBeVisible({ timeout: 15_000 });
  await page
    .getByRole("button", { name: "Teacher account", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState("networkidle");
  const response = await page.request.get("/api/auth/get-session");
  expect(await response.json()).toBeNull();
});
test("unauthenticated clients cannot read or mutate quizzes through server functions", async ({
  page,
}) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  const results = await page.evaluate(async () => {
    // Exercise the same compiled client entry points used by the real workspace.
    const path = "/src/lib/quizzes.functions.ts";
    const api = await import(/* @vite-ignore */ path);
    const quiz = {
      title: "Unauthorized",
      questions: [
        {
          prompt: "Question?",
          answers: ["a", "b", "c", "d"],
          correctIndex: 0,
          duration: 20,
        },
      ],
    };
    const calls = [
      () => api.listQuizzes(),
      () => api.persistQuiz({ data: quiz }),
      () => api.removeQuiz({ data: "not-yours" }),
      () => api.copyBrowserDrafts({ data: [quiz] }),
    ];
    return Promise.all(
      calls.map(async (call) => {
        try {
          await call();
          return "allowed";
        } catch {
          return "blocked";
        }
      }),
    );
  });
  expect(results).toEqual(["blocked", "blocked", "blocked", "blocked"]);
});
