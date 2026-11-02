import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { guest, hostControl, openRoom, post, state } from "./live.helpers";

test("second correct player gets 900 points and downloads their final result PNG", async ({
  browser,
  request,
}, info) => {
  test.setTimeout(90_000);
  const { code } = await openRoom(request);
  const first = await guest(browser, code, "Early Bird");
  const second = await guest(browser, code, "Curious Zoé");
  try {
    await hostControl(request, code, { type: "start" });
    const initial = await state(first.context.request, code);
    await post(first.context.request, `/api/live/rooms/${code}/answer`, {
      questionId: initial.question!.id,
      answer: 1,
    });
    await second.page
      .getByRole("button", { name: "Mars", exact: true })
      .click();
    await expect(second.page.locator(".answer-feedback")).toContainText(
      "Answer locked in",
    );
    expect(
      (await state(second.context.request, code)).self?.pointsEarned,
    ).toBeNull();
    await hostControl(request, code, { type: "reveal", questionIndex: 0 });
    await expect(second.page.locator(".answer-feedback")).toContainText(
      "+900 points",
    );
    await hostControl(request, code, { type: "end" });
    await second.page.reload();
    await second.page.waitForLoadState("networkidle");
    const result = await state(second.context.request, code);
    expect(result.self?.rank).toBe(2);
    expect(result.self?.score).toBe(900);
    const pending = second.page.waitForEvent("download");
    await second.page
      .getByRole("button", { name: "Share my result", exact: true })
      .click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(
      "funkwiz-result-Out-of-this-world.png",
    );
    const target = `/tmp/funkwiz-result-${info.project.name}.png`;
    await download.saveAs(target);
    const bytes = await readFile(target);
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    await expect(
      second.page.getByRole("status").filter({ hasText: "ready to share" }),
    ).toContainText("ready to share");
    await second.page.screenshot({
      path: `/tmp/funkwiz-finish-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    await first.context.close();
    await second.context.close();
  }
});
