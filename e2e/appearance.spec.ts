import { expect, test, type Page } from "@playwright/test";
import { guest, hostControl, openRoom } from "./live.helpers";

async function appearance(page: Page, value: "Light" | "Dark" | "System") {
  await page.getByRole("button", { name: "Appearance settings" }).click();
  await page.getByRole("menuitemradio", { name: value, exact: true }).click();
}
test("persists appearance, tracks system changes, and synchronizes other tabs", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await appearance(page, "Dark");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 28, 23)",
  );
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const other = await context.newPage();
  try {
    await other.goto("/join");
    await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
    await appearance(page, "Light");
    await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
    await appearance(page, "System");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Appearance settings" }).click();
    await expect(
      page.getByRole("menuitemradio", { name: "System", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByText("Following your device · light now"),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});
test("dark surfaces remain readable across teacher and student screens", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await appearance(page, "Dark");
  await page.screenshot({
    path: `/tmp/fun-quiz-dark-library-${info.project.name}.png`,
    fullPage: true,
  });
  for (const button of ["Create a quiz", "Teacher account"]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCSS(
      "background-color",
      "rgb(28, 43, 35)",
    );
    await page.screenshot({
      path: `/tmp/fun-quiz-dark-${button.replaceAll(" ", "-")}-${info.project.name}.png`,
    });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
  }
  const { code } = await openRoom(request);
  const student = await guest(browser, code, "Curious Ada");
  try {
    await page.goto(`/host/${code}`);
    await expect(page.locator(".live-page")).toHaveCSS(
      "background-color",
      "rgb(18, 28, 23)",
    );
    await page.screenshot({
      path: `/tmp/fun-quiz-dark-lobby-${info.project.name}.png`,
      fullPage: true,
    });
    await hostControl(request, code, { type: "start" });
    await expect(page.locator(".live-question-stage")).toBeVisible();
    await page.screenshot({
      path: `/tmp/fun-quiz-dark-question-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await hostControl(request, code, { type: "end" });
    await student.context.close();
  }
  for (const route of ["/join", "/forgot-password"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: `/tmp/fun-quiz-dark-${route.slice(1)}-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("appearance works when persistent browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "fun-quiz-appearance") throw new Error("Storage unavailable");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "fun-quiz-appearance") throw new Error("Storage unavailable");
      return set.call(this, key, value);
    };
  });
  await page.goto("/join");
  await appearance(page, "Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await appearance(page, "Light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
