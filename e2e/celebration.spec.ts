import { test, expect, type Page } from "@playwright/test";
import { guest, openRoom, hostControl, post, state } from "./live.helpers";

async function readyAudio(page: Page) {
  const enable = page.getByRole("button", {
    name: "Enable audio",
    exact: true,
  });
  const playing = page.getByRole("button", {
    name: "Turn music off",
    exact: true,
  });
  await expect(playing.or(enable)).toBeVisible();
  if (await enable.isVisible()) await enable.click();
  await expect(playing).toBeEnabled();
}

test("blocked autoplay has a tap fallback and a saved mute survives refresh", async ({
  page,
  request,
}) => {
  const { code } = await openRoom(request);
  await page.addInitScript(() => {
    const Native = AudioContext;
    Object.assign(window, { allowAudio: false, audioContexts: [] });
    Object.defineProperty(window, "AudioContext", {
      value: class extends Native {
        constructor() {
          super();
          (window as any).audioContexts.push(this);
        }
        override get state(): AudioContextState {
          return (window as any).allowAudio ? super.state : "suspended";
        }
        override resume() {
          return (window as any).allowAudio
            ? super.resume()
            : Promise.reject(new DOMException("Blocked", "NotAllowedError"));
        }
      },
    });
  });
  try {
    await page.goto(`/host/${code}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Enable audio", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      (window as any).allowAudio = true;
    });
    await page
      .getByRole("button", { name: "Enable audio", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Turn music off", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Turn sound off", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Turn music off", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Turn sound off", exact: true })
      .click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Turn music on", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enable audio", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as any).audioContexts.length),
    ).toBe(0);
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
  }
});

test("podium reveals the top three, keeps results music, and celebrates only qualifying players", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(120_000);
  const { code } = await openRoom(request);
  const students = [];
  try {
    await page.addInitScript(() => {
      const Native = AudioContext;
      Object.assign(window, { audioContexts: [] });
      Object.defineProperty(window, "AudioContext", {
        value: class extends Native {
          gains: GainNode[] = [];
          constructor() {
            super();
            (window as any).audioContexts.push(this);
          }
          override createGain() {
            const gain = super.createGain();
            this.gains.push(gain);
            return gain;
          }
        },
      });
    });
    await page.goto(`/host/${code}`);
    await readyAudio(page);
    for (const name of ["Nova", "Milo", "Zuri", "Ari"])
      students.push(await guest(browser, code, name));
    const started = await hostControl(request, code, { type: "start" });
    for (const student of students)
      await post(student.context.request, `/api/live/rooms/${code}/answer`, {
        questionId: started.question!.id,
        answer: 1,
      });
    await students[0].page.emulateMedia({ reducedMotion: "reduce" });
    await hostControl(request, code, { type: "end" });
    await expect(
      students[0].page.locator(".celebration-confetti"),
    ).toHaveAttribute("data-playing", "true");
    await expect(
      students[0].page.locator(".celebration-confetti i").first(),
    ).toHaveCSS("animation-name", "none");
    const stage = page.getByRole("region", { name: "Final podium" });
    await expect(stage).toBeVisible();
    for (const [i, name] of ["Nova", "Milo", "Zuri"].entries())
      await expect(stage.locator(`.place-${i + 1}`)).toContainText(name);
    await expect(
      students[0].page.getByText("You made the top three!", { exact: true }),
    ).toBeVisible();
    await expect(
      students[3].page.getByText("You made the top three!", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Turn music off", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).audioContexts[0].gains[1].gain.value,
        ),
      )
      .toBeGreaterThan(0.23);
    await expect(stage.locator(".place-1")).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: `/tmp/funkwiz-podium-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    const skip = page.getByRole("button", {
      name: "Skip animation",
      exact: true,
    });
    if (await skip.isVisible()) {
      await skip.click();
      await expect(stage).toHaveAttribute("data-playing", "false");
    }
    await page.reload();
    await expect(stage).toHaveAttribute("data-playing", "false");
    await expect(
      page.getByRole("button", { name: "Skip animation", exact: true }),
    ).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await students[0].page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      students[0].page.locator(".celebration-confetti i").first(),
    ).toHaveCSS("animation-name", "none");
    expect((await state(students[0].context.request, code)).self?.score).toBe(
      1000,
    );
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    for (const student of students) await student.context.close();
  }
});
