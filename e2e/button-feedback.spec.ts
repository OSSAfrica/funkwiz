import { test, expect, type Locator, type Page } from "@playwright/test";
async function theme(page: Page, mode: "Light" | "Dark") {
  await page.getByRole("button", { name: "Appearance settings" }).click();
  await page.getByRole("menuitemradio", { name: mode, exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    mode.toLowerCase(),
  );
  await page.mouse.move(0, 0);
}
async function press(page: Page, button: Locator, reduced = false) {
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) throw new Error("Missing button");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    await expect
      .poll(() =>
        button.evaluate((element) => {
          const value = getComputedStyle(element).transform;
          return value === "none" ? 0 : new DOMMatrixReadOnly(value).m42;
        }),
      )
      .toBe(reduced ? 0 : 2);
    await expect(button).toHaveCSS("box-shadow", /0px 1px 0px/);
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
}

test("primary colors match across themes and raised buttons press without moving the layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const primary = page.getByRole("button", {
    name: "Create a quiz",
    exact: true,
  });
  for (const mode of ["Light", "Dark"] as const) {
    await theme(page, mode);
    await expect(primary).toHaveCSS("background-color", "rgb(195, 68, 32)");
    await expect(primary).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(primary).toHaveCSS("box-shadow", /0px 3px 0px/);
    const top = await primary.evaluate(
      (element) => (element as HTMLElement).offsetTop,
    );
    await press(page, primary);
    expect(
      await primary.evaluate((element) => (element as HTMLElement).offsetTop),
    ).toBe(top);
    await expect(primary).toHaveCSS("box-shadow", /0px 3px 0px/);
    const secondary = page.getByRole("button", {
      name: "Try a practice round",
      exact: true,
    });
    await press(page, secondary);
    const outline = page
      .getByRole("button", { name: "Practice", exact: true })
      .first();
    await press(page, outline);
  }
  await page
    .getByRole("button", { name: "Teacher account", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await press(
    page,
    page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Sign out", exact: true }),
  );
  await page
    .getByRole("button", { name: "Stay signed in", exact: true })
    .click();
  await primary.scrollIntoViewIfNeeded();
  await page.keyboard.press("Tab");
  await primary.focus();
  await expect(primary).toHaveCSS("outline-style", "solid");
  await expect(primary).toHaveCSS("outline-width", "3px");
  await page.keyboard.down("Space");
  await expect
    .poll(() =>
      primary.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
      ),
    )
    .toBe(2);
  await page.keyboard.up("Space");
  const remove = page.getByRole("button", {
    name: "Remove current question",
    exact: true,
  });
  await expect(remove).toBeDisabled();
  await expect(remove).toHaveCSS("transform", "none");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
});

test("button links share primary colors and reduced motion keeps buttons still", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await page.waitForLoadState("networkidle");
  const link = page.getByRole("link", {
    name: "Get a new reset link",
    exact: true,
  });
  for (const mode of ["Light", "Dark"] as const) {
    await theme(page, mode);
    await expect(link).toHaveCSS("background-color", "rgb(195, 68, 32)");
    await press(page, link);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await press(page, link, true);
  await expect(link).toHaveCSS(
    "transition-property",
    "background-color, color",
  );
});
