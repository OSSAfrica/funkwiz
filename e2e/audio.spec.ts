import { expect, test, type Page } from "@playwright/test";
import { guest, hostControl, openRoom, post, quickQuiz } from "./live.helpers";

type Probe = {
  cues: string[];
  ticks: number;
  musicStarts: number;
  oscillators: number;
  duration: number;
  seam: number;
  contexts: { audio: AudioContext; gains: GainNode[] }[];
};
test.beforeEach(async ({ page }) => {
  // These manual-control scenarios opt out; autoplay is covered separately.
  await page.addInitScript(() =>
    localStorage.setItem(
      "funkwiz:audio:v1",
      JSON.stringify({ sound: false, music: false }),
    ),
  );
});
async function instrument(page: Page) {
  await page.evaluate(() =>
    localStorage.setItem(
      "funkwiz:audio:v1",
      JSON.stringify({ sound: false, music: false }),
    ),
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    const probe: Probe = {
      cues: [],
      ticks: 0,
      musicStarts: 0,
      oscillators: 0,
      duration: 0,
      seam: 0,
      contexts: [],
    };
    Object.assign(window, { audioProbe: probe });
    const Original = AudioContext;
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: class extends Original {
        captured: GainNode[] = [];
        constructor() {
          super();
          probe.contexts.push({ audio: this, gains: this.captured });
        }
        override createGain() {
          const gain = super.createGain();
          this.captured.push(gain);
          return gain;
        }
      },
    });
    const startBuffer = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.loop && this.buffer) {
        probe.musicStarts++;
        probe.duration = this.buffer.duration;
        const data = this.buffer.getChannelData(0);
        probe.seam = Math.abs(data[0] - data[data.length - 1]);
      } else if (this.buffer && this.buffer.duration < 0.1) probe.ticks++;
      return startBuffer.apply(this, args);
    };
    const startTone = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      probe.oscillators++;
      return startTone.apply(this, args);
    };
    const path = "/src/lib/live/game-audio.ts";
    const { GameAudio } = await import(/* @vite-ignore */ path);
    const cue = GameAudio.prototype.cue;
    GameAudio.prototype.cue = function (value: string) {
      probe.cues.push(value);
      return cue.call(this, value);
    };
  });
}
const probe = (page: Page) =>
  page.evaluate(() => {
    const p = (window as unknown as { audioProbe: Probe }).audioProbe;
    return {
      cues: p.cues,
      ticks: p.ticks,
      musicStarts: p.musicStarts,
      oscillators: p.oscillators,
      duration: p.duration,
      seam: p.seam,
      master: p.contexts[0]?.gains[0]?.gain.value ?? 0,
      music: p.contexts[0]?.gains[1]?.gain.value ?? 0,
      state: p.contexts[0]?.audio.state ?? "absent",
    };
  });
test("mixes a continuous marimba loop with timer ticks and server-confirmed answer cues", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(90_000);
  const { code } = await openRoom(request);
  const student = await guest(browser, code, "Curious Listener");
  try {
    await page.goto(`/host/${code}`);
    await page.waitForLoadState("networkidle");
    await instrument(page);
    await instrument(student.page);
    expect((await probe(page)).state).toBe("absent");
    await student.page
      .getByRole("button", { name: "Turn music on", exact: true })
      .click();
    await expect(
      student.page.getByRole("button", { name: "Turn music off", exact: true }),
    ).toBeEnabled();
    await expect
      .poll(async () => (await probe(student.page)).musicStarts)
      .toBe(1);
    expect((await probe(student.page)).duration).toBeCloseTo(48, 2);
    expect((await probe(student.page)).seam).toBeLessThan(0.08);
    await expect
      .poll(async () => (await probe(student.page)).music)
      .toBeGreaterThan(0.23);
    const lobbyGain = (await probe(student.page)).music;
    // Music alone is independent of effects.
    expect((await probe(student.page)).oscillators).toBe(0);
    await student.page
      .getByRole("button", { name: "Turn sound on", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Turn sound on", exact: true })
      .click();
    await hostControl(request, code, { type: "start" });
    await expect(
      student.page.getByRole("button", { name: "Mars", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => (await probe(student.page)).music)
      .toBeLessThan(lobbyGain * 0.5);
    await expect
      .poll(async () => (await probe(student.page)).ticks, { timeout: 4000 })
      .toBeGreaterThan(0);
    await hostControl(request, code, { type: "pause" });
    await expect
      .poll(async () => (await probe(student.page)).master)
      .toBeLessThan(0.001);
    const pausedTicks = (await probe(student.page)).ticks;
    await student.page.waitForTimeout(1200); // Verify an entire clock tick stays silent while paused.
    expect((await probe(student.page)).ticks).toBe(pausedTicks);
    await hostControl(request, code, { type: "resume" });
    await expect
      .poll(async () => (await probe(student.page)).master)
      .toBeGreaterThan(0.79);
    await student.page
      .getByRole("button", { name: "Mars", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await probe(student.page)).cues.filter((c) => c === "selected")
            .length,
      )
      .toBe(1);
    expect((await probe(student.page)).cues).not.toContain("correct");
    await hostControl(request, code, { type: "reveal", questionIndex: 0 });
    await expect
      .poll(
        async () =>
          (await probe(student.page)).cues.filter((c) => c === "correct")
            .length,
      )
      .toBe(1);
    expect((await probe(page)).cues).toContain("reveal");
    expect((await probe(page)).cues).not.toContain("correct");
    await hostControl(request, code, { type: "next", questionIndex: 0 });
    await student.page
      .getByRole("button", { name: "Magnetism", exact: true })
      .click();
    await hostControl(request, code, { type: "reveal", questionIndex: 1 });
    await expect
      .poll(async () => (await probe(student.page)).cues)
      .toContain("incorrect");
    await student.page.getByRole("button", { name: "Audio settings" }).click();
    const settings = student.page.getByRole("dialog", {
      name: "Classroom audio settings",
    });
    await settings.getByLabel("Music volume").press("Home");
    for (let i = 0; i < 6; i++)
      await settings.getByLabel("Music volume").press("ArrowRight");
    await settings.getByLabel("Effects volume").press("Home");
    for (let i = 0; i < 8; i++)
      await settings.getByLabel("Effects volume").press("ArrowRight");
    await settings.getByRole("switch", { name: "Gentle clock ticks" }).click();
    await expect(
      settings.getByRole("switch", { name: "Gentle clock ticks" }),
    ).toHaveAttribute("aria-checked", "false");
    await student.page.screenshot({
      path: `/tmp/fun-quiz-audio-controls-${info.project.name}.png`,
    });
    await student.page.keyboard.press("Escape");
    // Muting never requires an interrupted browser audio context to resume.
    await student.page.evaluate(() => {
      const context = (window as unknown as { audioProbe: Probe }).audioProbe
        .contexts[0].audio;
      Object.defineProperty(context, "state", {
        configurable: true,
        value: "interrupted",
      });
      Object.defineProperty(context, "resume", {
        configurable: true,
        value: () =>
          Promise.reject(new Error("Mute should not request resume")),
      });
    });
    await student.page
      .getByRole("button", { name: "Turn sound off", exact: true })
      .click();
    await expect(
      student.page.getByRole("button", { name: "Turn sound on", exact: true }),
    ).toBeVisible();
    await student.page
      .getByRole("button", { name: "Turn music off", exact: true })
      .click();
    await expect(
      student.page.getByRole("button", { name: "Turn music on", exact: true }),
    ).toBeEnabled();
    await student.page.evaluate(() => {
      const context = (window as unknown as { audioProbe: Probe }).audioProbe
        .contexts[0].audio;
      Reflect.deleteProperty(context, "state");
      Reflect.deleteProperty(context, "resume");
    });
    await student.page
      .getByRole("button", { name: "Turn sound on", exact: true })
      .click();
    await student.page
      .getByRole("button", { name: "Turn music on", exact: true })
      .click();
    await expect(
      student.page.getByRole("button", { name: "Turn music off", exact: true }),
    ).toBeEnabled();
    // Hidden tabs fade to silence and resume without replaying the reveal.
    await student.page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(async () => (await probe(student.page)).master)
      .toBeLessThan(0.001);
    await student.page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(async () => (await probe(student.page)).master)
      .toBeGreaterThan(0.79);
    expect(
      (await probe(student.page)).cues.filter((c) => c === "incorrect"),
    ).toHaveLength(1);
    await hostControl(request, code, { type: "end" });
    await expect
      .poll(async () => (await probe(student.page)).cues)
      .toContain("finished");
    await student.page
      .getByRole("link", { name: "Join another game", exact: true })
      .click();
    await expect
      .poll(async () => (await probe(student.page)).state)
      .toBe("closed");
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    await student.context.close();
  }
});
test("failed music loading is retryable and does not prevent sound effects", async ({
  page,
  request,
}) => {
  const { code } = await openRoom(request);
  try {
    await page.goto(`/host/${code}`);
    await page.waitForLoadState("networkidle");
    await page.route("**/audio/curious-garden.mp3", (route) => route.abort());
    await page
      .getByRole("button", { name: "Turn music on", exact: true })
      .click();
    await page.getByRole("button", { name: "Audio settings" }).click();
    await expect(page.getByRole("alert")).toContainText("Music couldn’t load");
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Turn sound on", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Turn sound off", exact: true }),
    ).toBeVisible();
    await page.unroute("**/audio/curious-garden.mp3");
    await page
      .getByRole("button", { name: "Turn music on", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Turn music off", exact: true }),
    ).toBeEnabled();
  } finally {
    await hostControl(request, code, { type: "end" });
  }
});

test("plays correctness only when the automatic timer reveals the answer", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(45_000);
  const quizId = await quickQuiz(page, "Audio timing rehearsal");
  const { code } = await openRoom(
    request,
    { progression: "automatic", display: "both", cooldown: 2 },
    quizId,
  );
  const student = await guest(browser, code, "Curious Timer");
  try {
    await instrument(student.page);
    await student.page
      .getByRole("button", { name: "Turn sound on", exact: true })
      .click();
    await hostControl(request, code, { type: "start" });
    await student.page
      .getByRole("button", { name: "Mars", exact: true })
      .click();
    await expect
      .poll(async () => (await probe(student.page)).cues)
      .toContain("selected");
    expect((await probe(student.page)).cues).not.toContain("correct");
    await expect
      .poll(async () => (await probe(student.page)).cues, { timeout: 8000 })
      .toContain("correct");
    await expect
      .poll(async () => (await probe(student.page)).cues, { timeout: 10_000 })
      .toContain("reveal");
    expect(
      (await probe(student.page)).cues.filter((cue) => cue === "correct"),
    ).toHaveLength(1);
  } finally {
    await post(request, `/api/live/rooms/${code}/control`, { type: "end" });
    await student.context.close();
  }
});
