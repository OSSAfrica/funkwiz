import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { liveOrigin, openRoom, post } from "./live.helpers";

test("scans the lobby QR code and opens the correct student join page", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(60_000);
  const { code } = await openRoom(request);
  const student = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  try {
    await page.goto(`/host/${code}`);
    await expect(page.locator(".connection-chip")).toContainText("Connected");
    await page
      .getByRole("button", { name: "Show QR code", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const qr = dialog.getByRole("img", {
      name: `Scan to join game ${code}`,
      exact: true,
    });
    await expect(qr).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    const pixels = await qr.evaluate(async (svg) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 280;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0, 280, 280);
      return Array.from(context.getImageData(0, 0, 280, 280).data);
    });
    const decoded = jsQR(new Uint8ClampedArray(pixels), 280, 280);
    expect(decoded?.data).toBe(`${liveOrigin}/join?code=${code}`);
    await page.screenshot({
      path: `/tmp/fun-quiz-qr-${info.project.name}.png`,
    });
    const join = await student.newPage();
    await join.goto(decoded!.data);
    await expect(join.getByLabel("Game code", { exact: true })).toHaveValue(
      code,
    );
    await join
      .getByLabel("Your nickname", { exact: true })
      .fill(`${info.project.name} Scanner`);
    await join
      .getByRole("button", { name: "Join the fun", exact: true })
      .click();
    await expect(
      join.getByText("Waiting for your teacher to start…"),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Show QR code", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("heading", { name: /1 player ready/ }),
    ).toBeVisible();
  } finally {
    await student.close();
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
  }
});
