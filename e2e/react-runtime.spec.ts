import { expect, test } from "@playwright/test";

test("renders Radix dialogs without hook errors on localhost and the numeric loopback origin", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Invalid hook call|Cannot read properties of null.*useRef/.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  const origin = new URL(
    test.info().project.use.baseURL ?? "http://127.0.0.1:3100",
  );
  for (const hostname of ["127.0.0.1", "localhost"]) {
    origin.hostname = hostname;
    if (hostname === "localhost") {
      const response = await page.request.post(
        `${origin.origin}/api/auth/sign-in/email`,
        {
          headers: { origin: origin.origin },
          data: {
            email: "teacher@example.test",
            password: "Only-a-local-test-password-42!",
          },
        },
      );
      expect(response.ok()).toBe(true);
    }
    await page.goto(origin.origin);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Create a quiz", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Teacher account", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Account settings", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "A space that’s all yours." }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
  }
  expect(errors).toEqual([]);
});
