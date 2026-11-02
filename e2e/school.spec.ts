import { execFileSync } from "node:child_process";
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
test.describe.configure({ mode: "serial" });
const base = "http://127.0.0.1:3102";
let fixtureIp = 10;
const fixtureHeaders = () => ({ "cf-connecting-ip": `192.0.2.${fixtureIp++}` });
const password = "Only-a-school-test-password-42!";
let ownerState: Awaited<ReturnType<BrowserContext["storageState"]>>;

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({
    baseURL: base,
    extraHTTPHeaders: fixtureHeaders(),
  });
  const result = await request.post("/api/auth/sign-up/email", {
    headers: {
      origin: base,
      "x-teacher-setup-code":
        "e2e-only-fake-setup-code-never-use-in-production",
    },
    data: { email: "teacher@example.test", name: "School Owner", password },
  });
  expect(result.ok()).toBe(true);
  ownerState = await request.storageState();
  await request.dispose();
});

test("workspace UI shares privately and creates revocable invitation links", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    baseURL: base,
    extraHTTPHeaders: fixtureHeaders(),
    storageState: ownerState,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await workspaceCall(page, "createWorkspace", { name: "Team controls" });
    const draft = await quizCall(
      page,
      "persistQuiz",
      quiz("Ready when I share"),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", {
        name: `Share ${draft.title} to workspace`,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: `Make ${draft.title} private`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `Make ${draft.title} private`, exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: `Share ${draft.title} to workspace`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Manage workspace", exact: true })
      .click();
    await page.getByRole("tab", { name: "Invitations", exact: true }).click();
    await page
      .getByLabel("Teacher email", { exact: true })
      .fill("revoked@example.test");
    await page
      .getByRole("button", { name: "Create invitation", exact: true })
      .click();
    const field = page.getByLabel("Private invitation link", { exact: true });
    await expect(field).toBeVisible();
    const link = await field.inputValue();
    await page
      .getByRole("button", { name: "Revoke invitation", exact: true })
      .click();
    await expect(field).toHaveCount(0);
    const token = new URL(link).searchParams.get("token")!;
    expect(await workspaceCall(page, "getWorkspaceInvitation", token)).toBe(
      null,
    );
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: base, "x-workspace-invitation": token },
      data: { name: "Revoked", email: "revoked@example.test", password },
    });
    expect(signup.status()).toBe(403);
    const expired = await workspaceCall(page, "inviteWorkspaceTeacher", {
      email: "expired@example.test",
      role: "teacher",
      emailDelivery: false,
    });
    fixtureSql(`UPDATE invitation SET expires_at=0 WHERE id='${expired.id}';`);
    const expiredToken = new URL(expired.url).searchParams.get("token")!;
    expect(
      await workspaceCall(page, "getWorkspaceInvitation", expiredToken),
    ).toBe(null);
  } finally {
    await context.close();
  }
});

function fixtureSql(sql: string) {
  execFileSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "e2e/worker/school.jsonc",
      "--persist-to",
      ".wrangler/e2e-school-state",
      "--command",
      sql,
    ],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: "/tmp/funkwiz-school-fixture.log",
      },
    },
  );
}
test("explicit migration preserves Personal IDs and refuses an active legacy game", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    baseURL: base,
    extraHTTPHeaders: fixtureHeaders(),
    storageState: ownerState,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await workspaceCall(page, "createWorkspace", {
      name: "Imported classroom",
    });
    const id = crypto.randomUUID(),
      reportId = crypto.randomUUID(),
      now = Date.now();
    const question = {
      id: crypto.randomUUID(),
      ...quiz("Legacy").questions[0],
    };
    const report = {
      id: reportId,
      code: "555444",
      title: "Legacy results",
      startedAt: now - 1000,
      endedAt: now,
      playerCount: 0,
      pointsPerCorrect: 1000,
      leaderboard: [],
      questions: [
        {
          ...question,
          counts: [0, 0, 0, 0],
          answered: 0,
          correct: 0,
          asked: true,
        },
      ],
    };
    const escape = (value: string) => value.replaceAll("'", "''");
    fixtureSql(
      `INSERT INTO quiz(id,owner_id,title,description,cover,questions,created_at,updated_at) SELECT '${id}',id,'Preserved Personal quiz','Legacy fixture','space','${escape(JSON.stringify([question]))}',${now},${now} FROM user WHERE email='teacher@example.test'; INSERT INTO live_session(id,owner_id,code,title,status,created_at,expires_at,report) SELECT '${reportId}',id,'555444','Legacy results','active',${now},${now + 60000},'${escape(JSON.stringify(report))}' FROM user WHERE email='teacher@example.test';`,
    );
    await expect(
      workspaceCall(page, "movePersonalLibrary", { confirmed: true }),
    ).rejects.toThrow(/Finish or close/);
    fixtureSql(
      `UPDATE live_session SET status='finished' WHERE id='${reportId}';`,
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Move Personal library", exact: true })
      .click();
    const move = page.getByRole("button", {
      name: "Move library to this workspace",
      exact: true,
    });
    await expect(move).toBeDisabled();
    await page
      .getByLabel("I have a backup and want to move this work", { exact: true })
      .click();
    await move.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const moved = (await quizCall(page, "listQuizzes")).find(
      (item: { id: string }) => item.id === id,
    );
    expect(moved.title).toBe("Preserved Personal quiz");
    expect(moved.visibility).toBe("private");
    expect((await reportCall(page, "readGameReport", reportId)).id).toBe(
      reportId,
    );
    const state = await workspaceCall(page, "getWorkspaceState");
    expect(state.legacyQuizzes).toBe(0);
    expect(state.legacyReports).toBe(0);
  } finally {
    await context.close();
  }
});

test("concurrent owner demotions retain at least one owner", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const ownerContext = await browser.newContext({
    baseURL: base,
    extraHTTPHeaders: fixtureHeaders(),
    storageState: ownerState,
  });
  const colleagueContext = await browser.newContext({
    baseURL: base,
    extraHTTPHeaders: fixtureHeaders(),
  });
  try {
    const owner = await ownerContext.newPage();
    await owner.goto("/");
    await owner.waitForLoadState("networkidle");
    await workspaceCall(owner, "createWorkspace", {
      name: "Ownership protection",
    });
    const invite = await workspaceCall(owner, "inviteWorkspaceTeacher", {
      email: "second-owner@example.test",
      role: "teacher",
      emailDelivery: false,
    });
    const colleague = await colleagueContext.newPage();
    await colleague.goto(invite.url);
    await colleague.waitForLoadState("networkidle");
    await colleague
      .getByLabel("Your name", { exact: true })
      .fill("Second Owner");
    await colleague
      .getByLabel("Choose a password", { exact: true })
      .fill(password);
    await colleague
      .getByRole("button", {
        name: "Create account and join workspace",
        exact: true,
      })
      .click();
    await expect(
      colleague.getByRole("heading", { name: /Your quiz collection/ }),
    ).toBeVisible();
    const management = await workspaceCall(owner, "getWorkspaceManagement");
    const first = management.members.find(
      (item: { email: string }) => item.email === "teacher@example.test",
    );
    const second = management.members.find(
      (item: { email: string }) => item.email === "second-owner@example.test",
    );
    await workspaceCall(owner, "changeWorkspaceMember", {
      memberId: second.id,
      role: "owner",
      remove: false,
    });
    const results = await Promise.allSettled([
      workspaceCall(owner, "changeWorkspaceMember", {
        memberId: second.id,
        role: "teacher",
        remove: false,
      }),
      workspaceCall(colleague, "changeWorkspaceMember", {
        memberId: first.id,
        role: "teacher",
        remove: false,
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const survivor = results[0].status === "fulfilled" ? owner : colleague;
    const final = await workspaceCall(survivor, "getWorkspaceManagement");
    expect(
      final.members.filter((item: { role: string }) => item.role === "owner"),
    ).toHaveLength(1);
  } finally {
    await Promise.all([ownerContext.close(), colleagueContext.close()]);
  }
});

async function workspaceCall(
  page: Page,
  name: string,
  data?: unknown,
): Promise<any> {
  return page.evaluate(
    async ({ name, data }) => {
      const path = "/src/lib/workspaces.functions.ts";
      const functions = await import(/* @vite-ignore */ path);
      return data === undefined ? functions[name]() : functions[name]({ data });
    },
    { name, data },
  );
}
async function quizCall(
  page: Page,
  name: string,
  data?: unknown,
): Promise<any> {
  return page.evaluate(
    async ({ name, data }) => {
      const path = "/src/lib/quizzes.functions.ts";
      const functions = await import(/* @vite-ignore */ path);
      return data === undefined ? functions[name]() : functions[name]({ data });
    },
    { name, data },
  );
}
async function reportCall(
  page: Page,
  name: string,
  data?: unknown,
): Promise<any> {
  return page.evaluate(
    async ({ name, data }) => {
      const path = "/src/lib/live/reports.functions.ts";
      const functions = await import(/* @vite-ignore */ path);
      return data === undefined ? functions[name]() : functions[name]({ data });
    },
    { name, data },
  );
}
const quiz = (title: string) => ({
  title,
  description: "A fictional school test",
  cover: "space",
  questions: [
    {
      prompt: "Which planet is red?",
      answers: ["Earth", "Mars", "Venus", "Neptune"],
      correctIndex: 1,
      duration: 10,
    },
  ],
});

test("invites teachers, isolates drafts and workspaces, and exposes reports only to authorized roles", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const ownerContext = await browser.newContext({
    baseURL: base,
    extraHTTPHeaders: fixtureHeaders(),
    storageState: ownerState,
  });
  const owner = await ownerContext.newPage();
  const contexts: BrowserContext[] = [ownerContext];
  try {
    await owner.goto("/");
    await owner.waitForLoadState("networkidle");
    const starting = await workspaceCall(owner, "getWorkspaceState");
    if (!starting.memberships.length)
      await expect(
        owner.getByRole("heading", { name: /Make room for more/ }),
      ).toBeVisible();
    await owner
      .getByRole("button", { name: "New workspace", exact: true })
      .click();
    await owner.getByLabel("Workspace name").fill("Science crew");
    await owner
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: /Your quiz collection/ }),
    ).toBeVisible();
    const state = await workspaceCall(owner, "getWorkspaceState");
    const science = state.active.id;
    const draft = await quizCall(
      owner,
      "persistQuiz",
      quiz("Owner private draft"),
    );
    const created = await workspaceCall(owner, "inviteWorkspaceTeacher", {
      email: "colleague@example.test",
      role: "teacher",
      emailDelivery: false,
    });
    const proof = new URL(created.url).searchParams.get("token");
    const anonymous = await browser.newContext({
      baseURL: base,
      extraHTTPHeaders: fixtureHeaders(),
    });
    contexts.push(anonymous);
    const forged = await anonymous.request.post("/api/auth/sign-up/email", {
      headers: { origin: base },
      data: {
        name: "Not invited proof",
        email: "colleague@example.test",
        password,
        emailVerified: true,
      },
    });
    expect(forged.status()).toBe(403);
    const stolenEmail = await anonymous.request.post(
      "/api/auth/sign-up/email",
      {
        headers: { origin: base, "x-workspace-invitation": proof! },
        data: {
          name: "Wrong address",
          email: "stranger@example.test",
          password,
        },
      },
    );
    expect(stolenEmail.status()).toBe(403);
    const colleague = await anonymous.newPage();
    await colleague.goto(created.url);
    await colleague.waitForLoadState("networkidle");
    await expect(
      colleague.getByRole("heading", {
        name: "Join Science crew",
        exact: true,
      }),
    ).toBeVisible();
    const head = await colleague.locator("head").innerHTML();
    expect(head).not.toContain(proof);
    expect(head).not.toContain("colleague@example.test");
    await colleague
      .getByLabel("Your name", { exact: true })
      .fill("Curious Colleague");
    await colleague
      .getByLabel("Choose a password", { exact: true })
      .fill(password);
    await colleague
      .getByRole("button", {
        name: "Create account and join workspace",
        exact: true,
      })
      .click();
    await expect(
      colleague.getByRole("heading", { name: /Your quiz collection/ }),
    ).toBeVisible();
    expect(new URL(colleague.url()).search).toBe("");
    expect(
      (await quizCall(colleague, "listQuizzes")).some(
        (item: { id: string }) => item.id === draft.id,
      ),
    ).toBe(false);
    await expect(
      workspaceCall(colleague, "getWorkspaceManagement"),
    ).rejects.toThrow();
    const ownDraft = await quizCall(
      colleague,
      "persistQuiz",
      quiz("Colleague private draft"),
    );
    await expect(
      quizCall(owner, "persistQuiz", { ...ownDraft, title: "Not my draft" }),
    ).rejects.toThrow();
    await quizCall(owner, "shareWorkspaceQuiz", { id: draft.id, shared: true });
    const shared = (await quizCall(colleague, "listQuizzes")).find(
      (item: { id: string }) => item.id === draft.id,
    );
    expect(shared.canEdit).toBe(false);
    const copied = await quizCall(colleague, "copyWorkspaceQuiz", draft.id);
    expect(copied.id).not.toBe(draft.id);
    expect(copied.visibility).toBe("private");
    await quizCall(owner, "shareWorkspaceQuiz", {
      id: draft.id,
      shared: false,
    });
    expect(
      (await quizCall(colleague, "listQuizzes")).some(
        (item: { id: string }) => item.id === draft.id,
      ),
    ).toBe(false);
    expect(
      (await quizCall(colleague, "listQuizzes")).some(
        (item: { id: string }) => item.id === copied.id,
      ),
    ).toBe(true);
    await expect(
      quizCall(colleague, "shareWorkspaceQuiz", { id: draft.id, shared: true }),
    ).rejects.toThrow();
    const reset = await anonymous.request.post(
      "/api/auth/reset-with-setup-code",
      {
        headers: { origin: base },
        data: {
          email: "colleague@example.test",
          setupCode: "e2e-only-fake-setup-code-never-use-in-production",
          newPassword: "A-new-test-password-never-allowed-42!",
        },
      },
    );
    expect(reset.status()).toBe(400);
    const externalOrg = await owner.request.post(
      "/api/auth/organization/create",
      { headers: { origin: base }, data: { name: "Bypass", slug: "bypass" } },
    );
    expect(externalOrg.status()).toBe(404);

    const opened = await owner.request.post("/api/live/rooms", {
      headers: { origin: base },
      data: {
        quizId: draft.id,
        settings: { progression: "manual", display: "both", cooldown: 5 },
      },
    });
    expect(opened.ok()).toBe(true);
    const room = await opened.json();
    const ended = await owner.request.post(
      `/api/live/rooms/${room.code}/control`,
      { headers: { origin: base }, data: { type: "end" } },
    );
    expect(ended.ok()).toBe(true);
    expect(await reportCall(colleague, "readGameReport", room.sessionId)).toBe(
      null,
    );
    const management = await workspaceCall(owner, "getWorkspaceManagement");
    const membership = management.members.find(
      (item: { email: string }) => item.email === "colleague@example.test",
    );
    await workspaceCall(owner, "changeWorkspaceMember", {
      memberId: membership.id,
      role: "admin",
      remove: false,
    });
    const adminReport = await reportCall(
      colleague,
      "readGameReport",
      room.sessionId,
    );
    expect(adminReport.id).toBe(room.sessionId);
    expect(adminReport.questions).toHaveLength(0);
    expect(
      (await reportCall(owner, "readGameReport", room.sessionId)).questions,
    ).toHaveLength(1);
    expect(
      (await quizCall(colleague, "listQuizzes")).some(
        (item: { id: string }) => item.id === draft.id,
      ),
    ).toBe(false);

    const second = await workspaceCall(owner, "createWorkspace", {
      name: "Arts club",
    });
    const artsQuiz = await quizCall(
      owner,
      "persistQuiz",
      quiz("Arts private draft"),
    );
    await quizCall(owner, "shareWorkspaceQuiz", {
      id: artsQuiz.id,
      shared: true,
    });
    expect(
      (await quizCall(colleague, "listQuizzes")).some(
        (item: { id: string }) => item.id === artsQuiz.id,
      ),
    ).toBe(false);
    await expect(
      workspaceCall(colleague, "selectWorkspace", second.id),
    ).rejects.toThrow();
    await expect(
      quizCall(colleague, "copyWorkspaceQuiz", artsQuiz.id),
    ).rejects.toThrow();
    const artsOpened = await owner.request.post("/api/live/rooms", {
      headers: { origin: base },
      data: {
        quizId: artsQuiz.id,
        settings: { progression: "manual", display: "both", cooldown: 5 },
      },
    });
    const artsRoom = await artsOpened.json();
    await owner.request.post(`/api/live/rooms/${artsRoom.code}/control`, {
      headers: { origin: base },
      data: { type: "end" },
    });
    expect(
      await reportCall(colleague, "readGameReport", artsRoom.sessionId),
    ).toBe(null);
    await workspaceCall(owner, "selectWorkspace", science);
    await owner.reload();
    await owner.waitForLoadState("networkidle");
    await owner.setViewportSize({ width: 390, height: 844 });
    expect(
      await owner.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await owner
      .getByRole("button", { name: "Manage workspace", exact: true })
      .click();
    await expect(owner.getByRole("dialog")).toBeVisible();
    await expect(
      owner.getByRole("tab", { name: "Invitations", exact: true }),
    ).toBeVisible();
    await expect(
      workspaceCall(colleague, "createWorkspace", {
        name: "Not an owner’s workspace",
      }),
    ).rejects.toThrow();
    const ownerMember = management.members.find(
      (item: { email: string }) => item.email === "teacher@example.test",
    );
    await expect(
      workspaceCall(owner, "changeWorkspaceMember", {
        memberId: ownerMember.id,
        remove: true,
      }),
    ).rejects.toThrow();
    await workspaceCall(owner, "changeWorkspaceMember", {
      memberId: membership.id,
      remove: true,
    });
    await expect(quizCall(colleague, "listQuizzes")).rejects.toThrow();
    await expect(
      workspaceCall(colleague, "acceptWorkspaceInvitation", proof),
    ).rejects.toThrow();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
