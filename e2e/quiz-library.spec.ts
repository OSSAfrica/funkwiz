import { test, expect, type Page } from "@playwright/test";
import { quickQuiz } from "./live.helpers";

test.use({ timezoneId: "America/Los_Angeles" });

function hydrationErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      /hydrat|server rendered HTML/i.test(message.text()) &&
      message.type() === "error"
    )
      errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("quiz creation dates survive edits and sorting works with search and filters", async ({
  page,
}) => {
  const errors = hydrationErrors(page);
  const suffix = Date.now();
  const zebra = `Library ${suffix} Zebra`;
  const apple = `Library ${suffix} Apple`;
  const olderId = await quickQuiz(page, zebra);
  const newerId = await quickQuiz(page, apple);
  const dates = await page.evaluate(
    async ({ olderId, newerId }) => {
      const path = "/src/lib/quizzes.functions.ts";
      const api = await import(/* @vite-ignore */ path);
      const quizzes = await api.listQuizzes();
      const older = quizzes.find((q: { id: string }) => q.id === olderId)!;
      const newer = quizzes.find((q: { id: string }) => q.id === newerId)!;
      const saved = await api.persistQuiz({
        data: {
          ...older,
          description: "Edited after creating the next quiz",
          createdAt: "2000-01-01T00:00:00Z",
        },
      });
      return {
        original: older.createdAt,
        saved: saved.createdAt,
        newer: newer.createdAt,
      };
    },
    { olderId, newerId },
  );
  expect(dates.saved).toBe(dates.original);
  expect(Date.parse(dates.original)).toBeLessThan(Date.parse(dates.newer));

  await page.reload();
  await page.waitForLoadState("networkidle");
  const search = page.getByRole("textbox", { name: "Search quizzes" });
  await search.fill(`Library ${suffix}`);
  const titles = page.locator(".quiz-card h3");
  await expect(titles).toHaveText([apple, zebra]);
  for (const [option, expected] of [
    ["Date created: oldest first", [zebra, apple]],
    ["Name: A–Z", [apple, zebra]],
    ["Name: Z–A", [zebra, apple]],
    ["Date created: newest first", [apple, zebra]],
  ] as const) {
    await page.getByRole("combobox", { name: "Sort quizzes" }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await expect(titles).toHaveText([...expected]);
  }
  await page.getByRole("tab", { name: /My drafts/ }).click();
  await expect(titles).toHaveText([apple, zebra]);
  const card = page
    .locator(".quiz-card")
    .filter({ has: page.getByRole("heading", { name: zebra, exact: true }) });
  const time = card.locator("time");
  await expect(time).toHaveAttribute("datetime", dates.original);
  const expected = await page.evaluate((value) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Los_Angeles",
    }).formatToParts(new Date(value));
    const get = (type: string) =>
      parts.find((part) => part.type === type)!.value;
    return `${get("day")} ${get("month")} ${get("year")} at ${Number(get("hour"))}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
  }, dates.original);
  await expect(time).toHaveText(expected);
  const html = await (await page.request.get("/")).text();
  expect(html.includes("UTC</time>")).toBe(true);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("Proton Pass section attributes do not trigger a hydration warning", async ({
  page,
}) => {
  const errors = hydrationErrors(page);
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const section = document.querySelector("section.library-section");
      if (section) {
        section.setAttribute("data-protonpass-form", "");
        document.documentElement.dataset.extensionInjectedBeforeHydration =
          String(document.querySelector(".app-shell")?.hasAttribute("inert"));
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("section.library-section")).toHaveAttribute(
    "data-protonpass-form",
    "",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-extension-injected-before-hydration",
    "true",
  );
  await expect(
    page.getByRole("combobox", { name: "Sort quizzes" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
