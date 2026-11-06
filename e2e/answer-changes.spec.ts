import { expect, test, type Page } from "@playwright/test";
import { guest, hostControl, quickQuiz, state, post } from "./live.helpers";

async function expectControlsAboveLeaderboard(page: Page) {
  const controls = page.locator(".host-control-bar");
  const leaderboard = page.getByRole("region", {
    name: "Leaderboard",
    exact: true,
  });
  await expect(controls).toHaveCount(1);
  await expect(leaderboard).toBeVisible();
  expect(
    await controls.evaluate((element) =>
      Boolean(
        element.compareDocumentPosition(
          document.querySelector(".live-leaderboard")!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  const controlsBox = await controls.boundingBox();
  const leaderboardBox = await leaderboard.boundingBox();
  expect(controlsBox).not.toBeNull();
  expect(leaderboardBox).not.toBeNull();
  expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(
    leaderboardBox!.y,
  );
}

test("allows changing a saved answer and switches back to locked answers between questions", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(90_000);
  const title = `${info.project.name} Change your mind`;
  await quickQuiz(page, title, 120);
  await page.reload();
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card.getByRole("button", { name: "Host live", exact: true }).click();
  const allow = page.getByRole("switch", {
    name: "Allow answer changes",
    exact: true,
  });
  await expect(allow).not.toBeChecked();
  await allow.check();
  await page
    .getByRole("button", { name: "Open live lobby", exact: true })
    .click();
  await expect(page).toHaveURL(/\/host\/\d{6}$/);
  const code = new URL(page.url()).pathname.split("/").pop()!;
  const first = await guest(browser, code, `${info.project.name} Ada`);
  const second = await guest(browser, code, `${info.project.name} Ben`);
  try {
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await expect(
      first.page.getByRole("button", { name: "Earth", exact: true }),
    ).toBeVisible();
    await first.page
      .getByRole("button", { name: "Earth", exact: true })
      .click();
    await expect(first.page.locator(".answer-feedback")).toContainText(
      "Answer saved",
    );
    await second.page
      .getByRole("button", { name: "Mars", exact: true })
      .click();
    await expect(second.page.locator(".answer-feedback")).toContainText(
      "Answer saved",
    );
    await first.page.getByRole("button", { name: "Mars", exact: true }).click();
    await expect(
      first.page.getByRole("button", { name: "Mars", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await first.page.reload();
    await first.page.waitForLoadState("networkidle");
    await expect(
      first.page.getByRole("button", { name: "Mars", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      first.page.getByRole("button", { name: "Earth", exact: true }),
    ).toBeEnabled();
    const hidden = await state(first.context.request, code);
    expect(hidden.self?.correct).toBeNull();
    expect(hidden.question).not.toHaveProperty("correctIndex");
    await page
      .getByRole("button", { name: "Reveal answer", exact: true })
      .click();
    await expectControlsAboveLeaderboard(page);
    await expect(
      page.getByRole("button", { name: "Next question", exact: true }),
    ).toBeVisible();
    await expect(first.page.locator(".answer-feedback")).toContainText(
      /\+[\d,]+ points/,
    );
    await expect(second.page.locator(".answer-feedback")).toContainText(
      /\+[\d,]+ points/,
    );
    const rejected = await post(
      first.context.request,
      `/api/live/rooms/${code}/answer`,
      { questionId: hidden.question!.id, answer: 0 },
    );
    expect(rejected.ok()).toBe(false);
    await page
      .getByRole("button", { name: "Game settings", exact: true })
      .click();
    await page
      .getByRole("switch", { name: "Allow answer changes", exact: true })
      .uncheck();
    await page
      .getByRole("button", { name: "Apply settings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Next question", exact: true })
      .click();
    await first.page
      .getByRole("button", { name: "Earth", exact: true })
      .click();
    await expect(first.page.locator(".answer-feedback")).toContainText(
      "Answer locked in",
    );
    await expect(
      first.page.getByRole("button", { name: "The Sun", exact: true }),
    ).toBeDisabled();
    const locked = await state(first.context.request, code);
    const retry = await post(
      first.context.request,
      `/api/live/rooms/${code}/answer`,
      { questionId: locked.question!.id, answer: 2 },
    );
    expect(retry.ok()).toBe(true);
    expect((await retry.json()).self.answer).toBe(0);
    await page
      .getByRole("button", { name: "Reveal answer", exact: true })
      .click();
    await expectControlsAboveLeaderboard(page);
    await expect(
      page.getByRole("button", { name: "Finish game", exact: true }),
    ).toBeVisible();
    await hostControl(request, code, { type: "end" });
  } finally {
    await first.context.close();
    await second.context.close();
  }
});
