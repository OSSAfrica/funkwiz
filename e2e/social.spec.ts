import { expect, test } from "@playwright/test";
import {
  guest,
  hostControl,
  liveOrigin,
  openRoom,
  post,
  quickQuiz,
} from "./live.helpers";

test("crawler HTML provides complete social cards without JavaScript or authentication", async ({
  browser,
}) => {
  const crawler = await browser.newContext({
    javaScriptEnabled: false,
    storageState: { cookies: [], origins: [] },
    baseURL: liveOrigin,
  });
  try {
    const page = await crawler.newPage();
    for (const [url, image, canonical] of [
      ["/join", "join", "/join"],
      [
        "/join?code=012345&utm_source=private-test",
        "join",
        "/join?code=012345",
      ],
      ["/play/012345", "join", "/join?code=012345"],
      ["/login?error=private-oauth-message", "teacher", "/login"],
      ["/forgot-password", "teacher", "/forgot-password"],
      [
        "/reset-password?token=never-share-this-fake-token&email=private@example.test",
        "teacher",
        "/forgot-password",
      ],
    ]) {
      const response = await page.goto(url);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('head meta[property="og:image"]')).toHaveCount(
        1,
      );
      await expect(
        page.locator('head meta[property="og:image"]'),
      ).toHaveAttribute("content", `${liveOrigin}/og/${image}-v1.png`);
      await expect(
        page.locator('head meta[property="og:url"]'),
      ).toHaveAttribute("content", `${liveOrigin}${canonical}`);
      await expect(
        page.locator('head meta[property="og:image:width"]'),
      ).toHaveAttribute("content", "1200");
      await expect(
        page.locator('head meta[property="og:image:height"]'),
      ).toHaveAttribute("content", "630");
      await expect(
        page.locator('head meta[property="og:image:alt"]'),
      ).toHaveAttribute("content", /Fun Quiz/);
      await expect(
        page.locator('head meta[name="twitter:card"]'),
      ).toHaveAttribute("content", "summary_large_image");
      await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${liveOrigin}${canonical}`,
      );
      const previews = await page
        .locator("head meta")
        .evaluateAll((tags) =>
          tags.map((tag) => tag.getAttribute("content")).join(" "),
        );
      expect(previews).not.toContain("never-share-this-fake-token");
      expect(previews).not.toContain("private@example.test");
      expect(previews).not.toContain("private-oauth-message");
      expect(previews).not.toContain("utm_source");
      if (url.startsWith("/reset") || url.startsWith("/forgot")) {
        expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
        expect(response?.headers()["cache-control"]).toContain("no-store");
        await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
          "content",
          "no-referrer",
        );
      }
    }
    for (const name of ["fun-quiz", "join", "teacher"]) {
      const response = await crawler.request.get(`/og/${name}-v1.png`);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/png");
      const bytes = await response.body();
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
      expect(bytes.length).toBeLessThan(500_000);
    }
  } finally {
    await crawler.close();
  }
});

test("social metadata updates after client navigation and is independent of appearance", async ({
  browser,
}) => {
  const visitor = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: liveOrigin,
  });
  try {
    const page = await visitor.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${liveOrigin}/og/teacher-v1.png`,
    );
    await page.getByRole("link", { name: /Joining a classroom game/ }).click();
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${liveOrigin}/og/join-v1.png`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await page
      .getByRole("menuitemradio", { name: "Dark", exact: true })
      .click();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${liveOrigin}/og/join-v1.png`,
    );
    await page.getByRole("link", { name: /Teacher sign-in/ }).click();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${liveOrigin}/og/teacher-v1.png`,
    );
    await page.getByRole("link", { name: /Forgot your password/ }).click();
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${liveOrigin}/forgot-password`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally {
    await visitor.close();
  }
});

test("private game titles, learner names and report data never become social metadata", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(60_000);
  const quizId = await quickQuiz(
    page,
    "Private classroom title never for previews",
  );
  const { code, sessionId } = await openRoom(request, undefined, quizId);
  const student = await guest(browser, code, "Private Learner");
  try {
    await hostControl(request, code, { type: "start" });
    await hostControl(request, code, { type: "end" });
    await page.goto(`/reports/${sessionId}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Classroom insights | Fun Quiz",
    );
    const head = await page.locator("head").innerHTML();
    expect(head).not.toContain("Private classroom title never for previews");
    expect(head).not.toContain("Private Learner");
    expect(head).not.toContain("Which planet is red?");
    expect(head).not.toContain("teacher@example.test");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${liveOrigin}/login`,
    );
    await student.page.goto(`${liveOrigin}/reports/${sessionId}`);
    await expect(student.page).toHaveURL(/\/login/);
    await expect(
      student.page.locator('meta[property="og:image"]'),
    ).toHaveAttribute("content", `${liveOrigin}/og/teacher-v1.png`);
    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${liveOrigin}/og/fun-quiz-v1.png`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    await student.context.close();
  }
});
