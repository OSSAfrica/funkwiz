import {
  musicSceneLevel,
  type AudioCue,
  type AudioScene,
} from "./audio-policy";

export const musicTrack = "/audio/curious-garden.mp3";
export const musicLoopSeconds = 48;

/** One locally controlled mix per game page; constructed only by a user gesture. */
export class GameAudio {
  readonly context: AudioContext;
  readonly #master: GainNode;
  readonly #music: GainNode;
  readonly #duck: GainNode;
  readonly #effects: GainNode;
  readonly #noise: AudioBuffer;
  readonly #abort = new AbortController();
  readonly #voices = new Set<AudioScheduledSourceNode>();
  readonly #effectVoices = new Set<AudioScheduledSourceNode>();
  readonly #ticks = new Set<AudioScheduledSourceNode>();
  #scene: AudioScene = {
    phase: null,
    audible: false,
    questionId: "",
    deadline: null,
  };
  #musicEnabled = false;
  #soundEnabled = false;
  #timerEnabled = true;
  #musicVolume = 0.6;
  #effectsVolume = 0.65;
  #buffer: Promise<AudioBuffer> | undefined;
  #source:
    | { node: AudioBufferSourceNode; fade: GainNode; started: number }
    | undefined;
  #offset = 0;
  #lastTick = "";
  #timer: ReturnType<typeof setInterval> | undefined;
  #closed = false;

  constructor() {
    const audio = (this.context = new AudioContext());
    this.#master = audio.createGain();
    this.#master.gain.value = 0;
    this.#master.connect(audio.destination);
    this.#music = audio.createGain();
    this.#duck = audio.createGain();
    this.#effects = audio.createGain();
    this.#music.connect(this.#duck).connect(this.#master);
    this.#effects.connect(this.#master);
    this.#effects.gain.value = 0;
    this.#noise = audio.createBuffer(
      1,
      Math.ceil(audio.sampleRate * 0.05),
      audio.sampleRate,
    );
    const data = this.#noise.getChannelData(0);
    let seed = 73;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }
  async resume() {
    if (this.context.state !== "running") await this.context.resume();
    if (this.context.state !== "running")
      throw new Error("Audio needs another tap to start.");
  }
  #ramp(parameter: AudioParam, value: number, seconds = 0.1) {
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(value, now, seconds / 3);
  }
  update(scene: AudioScene) {
    if (this.#closed) return;
    const resetTimer =
      this.#scene.questionId !== scene.questionId ||
      this.#scene.deadline !== scene.deadline;
    this.#scene = scene;
    if (!scene.audible) this.#cancelEffects();
    this.#ramp(this.#master.gain, scene.audible ? 0.8 : 0);
    this.#ramp(
      this.#music.gain,
      this.#musicVolume * 0.4 * musicSceneLevel(scene.phase),
      0.25,
    );
    if (resetTimer) this.#cancelTicks();
    this.#syncTimer();
    if (!scene.audible || !musicSceneLevel(scene.phase)) this.#stopMusic();
    else if (this.#musicEnabled) void this.#startMusic().catch(() => {});
  }
  setSound(enabled: boolean) {
    this.#soundEnabled = enabled;
    if (!enabled) this.#cancelEffects();
    this.#ramp(this.#effects.gain, enabled ? this.#effectsVolume : 0, 0.04);
    this.#syncTimer();
  }
  setTimer(enabled: boolean) {
    this.#timerEnabled = enabled;
    this.#syncTimer();
  }
  setMusicVolume(value: number) {
    this.#musicVolume = Math.max(0, Math.min(1, value));
    this.#ramp(
      this.#music.gain,
      this.#musicVolume * 0.4 * musicSceneLevel(this.#scene.phase),
      0.15,
    );
  }
  setEffectsVolume(value: number) {
    this.#effectsVolume = Math.max(0, Math.min(1, value));
    this.#ramp(
      this.#effects.gain,
      this.#soundEnabled ? this.#effectsVolume : 0,
      0.04,
    );
  }
  async setMusic(enabled: boolean) {
    this.#musicEnabled = enabled;
    if (!enabled) {
      this.#stopMusic();
      return;
    }
    try {
      await this.#loadMusic();
      await this.#startMusic();
    } catch (error) {
      this.#musicEnabled = false;
      this.#buffer = undefined;
      throw error;
    }
  }
  #loadMusic() {
    if (this.#closed)
      return Promise.reject(new Error("Audio has been closed."));
    this.#buffer ??= fetch(musicTrack, {
      signal: AbortSignal.any([
        this.#abort.signal,
        AbortSignal.timeout(10_000),
      ]),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Music could not be loaded.");
      return this.context.decodeAudioData(await response.arrayBuffer());
    });
    return this.#buffer;
  }
  async #startMusic() {
    if (
      this.#closed ||
      this.#source ||
      !this.#musicEnabled ||
      !this.#scene.audible ||
      !musicSceneLevel(this.#scene.phase)
    )
      return;
    const buffer = await this.#loadMusic();
    if (
      this.#closed ||
      this.#source ||
      !this.#musicEnabled ||
      !this.#scene.audible ||
      !musicSceneLevel(this.#scene.phase)
    )
      return;
    const audio = this.context,
      node = audio.createBufferSource(),
      fade = audio.createGain();
    node.buffer = buffer;
    node.loop = true;
    node.loopEnd = Math.min(musicLoopSeconds, buffer.duration);
    node.connect(fade).connect(this.#music);
    fade.gain.setValueAtTime(0, audio.currentTime);
    fade.gain.linearRampToValueAtTime(1, audio.currentTime + 0.25);
    const started = audio.currentTime;
    node.start(started, this.#offset % node.loopEnd);
    this.#source = { node, fade, started };
    this.#voices.add(node);
    node.onended = () => {
      node.disconnect();
      fade.disconnect();
      this.#voices.delete(node);
    };
  }
  #stopMusic() {
    const source = this.#source;
    if (!source) return;
    this.#source = undefined;
    this.#offset =
      (this.#offset + this.context.currentTime - source.started) %
      musicLoopSeconds;
    this.#ramp(source.fade.gain, 0, 0.12);
    source.node.stop(this.context.currentTime + 0.15);
  }
  #syncTimer() {
    const active =
      this.#soundEnabled &&
      this.#timerEnabled &&
      this.#scene.audible &&
      this.#scene.phase === "question" &&
      this.#scene.deadline !== null;
    if (active && !this.#timer) {
      this.#scheduleTick();
      this.#timer = setInterval(() => this.#scheduleTick(), 50);
    } else if (!active) {
      clearInterval(this.#timer);
      this.#timer = undefined;
      this.#cancelTicks();
    }
  }
  #cancelEffects() {
    for (const voice of this.#effectVoices) {
      try {
        voice.stop(this.context.currentTime + 0.025);
      } catch {
        /* Already ended. */
      }
    }
    this.#effectVoices.clear();
  }
  #cancelTicks() {
    for (const source of this.#ticks) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.#ticks.clear();
  }
  #scheduleTick() {
    if (
      this.#closed ||
      this.context.state !== "running" ||
      !this.#scene.audible ||
      this.#scene.deadline === null
    )
      return;
    const remaining = this.#scene.deadline - Date.now();
    if (remaining <= 0) {
      clearInterval(this.#timer);
      this.#timer = undefined;
      return;
    }
    const second = Math.ceil(remaining / 1000) - 1;
    if (second <= 0) return;
    const until = this.#scene.deadline - second * 1000 - Date.now();
    const key = `${this.#scene.questionId}:${second}`;
    if (until > 110 || key === this.#lastTick) return;
    this.#lastTick = key;
    this.#tick(
      this.context.currentTime + Math.max(0, until / 1000),
      second % 2 === 0,
    );
  }
  #tick(when: number, high: boolean) {
    const audio = this.context,
      source = audio.createBufferSource(),
      filter = audio.createBiquadFilter(),
      gain = audio.createGain();
    source.buffer = this.#noise;
    filter.type = "bandpass";
    filter.frequency.value = high ? 1150 : 780;
    filter.Q.value = 2.8;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.09, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
    source.connect(filter).connect(gain).connect(this.#effects);
    this.#effectVoices.add(source);
    this.#ticks.add(source);
    this.#voices.add(source);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.#effectVoices.delete(source);
      this.#ticks.delete(source);
      this.#voices.delete(source);
    };
    source.start(when);
    source.stop(when + 0.05);
  }
  cue(cue: AudioCue) {
    if (
      this.#closed ||
      !this.#soundEnabled ||
      !this.#scene.audible ||
      this.context.state !== "running"
    )
      return;
    const patterns: Record<AudioCue, number[]> = {
      question: [261.63, 392],
      selected: [587.33],
      correct: [523.25, 659.25, 783.99],
      incorrect: [349.23, 293.66],
      reveal: [392, 523.25],
      finished: [349.23, 440, 523.25, 698.46],
    };
    const now = this.context.currentTime,
      notes = patterns[cue];
    this.#duck.gain.cancelScheduledValues(now);
    this.#duck.gain.setTargetAtTime(0.5, now, 0.025);
    this.#duck.gain.setTargetAtTime(
      1,
      now + (cue === "selected" ? 0.18 : 0.7),
      0.12,
    );
    notes.forEach((hz, index) =>
      this.#mallet(
        hz,
        now + index * 0.13,
        cue === "selected" ? 0.09 : 0.12,
        cue === "selected" ? 0.17 : 0.5,
      ),
    );
  }
  #mallet(hz: number, when: number, level: number, duration: number) {
    for (const [ratio, amount, decay] of [
      [1, 1, duration],
      [3.99, 0.15, 0.075],
    ]) {
      const oscillator = this.context.createOscillator(),
        gain = this.context.createGain();
      oscillator.frequency.value = hz * ratio;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(level * amount, when + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      oscillator.connect(gain).connect(this.#effects);
      this.#voices.add(oscillator);
      this.#effectVoices.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.#voices.delete(oscillator);
        this.#effectVoices.delete(oscillator);
      };
      oscillator.start(when);
      oscillator.stop(when + decay + 0.03);
    }
  }
  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#abort.abort();
    clearInterval(this.#timer);
    for (const voice of this.#voices) {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.#effectVoices.clear();
    this.#voices.clear();
    this.#ticks.clear();
    this.#source = undefined;
    void this.context.close().catch(() => {});
  }
}
