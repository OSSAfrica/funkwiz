/** Original Fun Quiz composition. Run with Bun; ffmpeg encodes the gapless MP3. */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const rate = 32000,
  beat = 60 / 80,
  bars = 16,
  seconds = bars * beat * 4;
const length = Math.round(seconds * rate);
const left = new Float64Array(length),
  right = new Float64Array(length);
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
function addNote(
  start: number,
  midi: number,
  amplitude: number,
  pan: number,
  kind: "mallet" | "bass" | "pad" = "mallet",
) {
  const hz = frequency(midi),
    duration = kind === "pad" ? 3.8 : kind === "bass" ? 2.4 : 2;
  for (let i = 0; i < duration * rate; i++) {
    const t = i / rate,
      phase = 2 * Math.PI * hz * t;
    let value: number;
    if (kind === "mallet") {
      // A wooden fundamental with quickly fading, inharmonic marimba partials.
      const attack = 1 - Math.exp(-t / 0.006);
      value =
        attack *
        (Math.sin(phase) * Math.exp(-t / 0.46) +
          0.23 * Math.sin(phase * 3.99) * Math.exp(-t / 0.1) +
          0.055 * Math.sin(phase * 9.97) * Math.exp(-t / 0.035));
    } else if (kind === "bass") {
      value =
        (1 - Math.exp(-t / 0.035)) *
        Math.exp(-t / 0.65) *
        (Math.sin(phase) + 0.1 * Math.sin(phase * 2));
    } else {
      const envelope = Math.sin((Math.PI * t) / duration) ** 2;
      value = envelope * (Math.sin(phase) + 0.1 * Math.sin(phase * 2.001));
    }
    value *= Math.min(1, (duration - t) / 0.08);
    const sample = (Math.round(start * rate) + i) % length;
    left[sample] += value * amplitude * Math.sqrt((1 - pan) / 2);
    right[sample] += value * amplitude * Math.sqrt((1 + pan) / 2);
  }
}
// Fmaj9 / Dm7 / Bbmaj9 / C6, with a spacious, two-phrase melody.
const harmony = [
  [41, 57, 60, 64],
  [38, 53, 57, 60],
  [34, 53, 57, 60],
  [36, 52, 55, 57],
];
const melody = [
  [65, 69, 72, 69],
  [67, 65, 62, 60],
  [69, 72, 74, 72],
  [67, 69, 67, 65],
  [65, 69, 67, 72],
  [69, 65, 62, 65],
  [67, 72, 69, 67],
  [65, 64, 67, 65],
  [69, 72, 77, 72],
  [69, 67, 65, 62],
  [65, 69, 72, 69],
  [67, 64, 62, 60],
  [65, 69, 72, 74],
  [72, 69, 65, 62],
  [67, 69, 67, 64],
  [65, 60, 67, 65],
];
for (let bar = 0; bar < bars; bar++) {
  const start = bar * 4 * beat,
    chord = harmony[Math.floor(bar / 2) % harmony.length];
  addNote(start, chord[0], 0.11, -0.08, "bass");
  for (const note of chord.slice(1)) addNote(start, note, 0.018, 0.05, "pad");
  for (let i = 0; i < 4; i++) {
    const timing = [0, 1.25, 2, 3.25][i];
    addNote(
      start + timing * beat,
      melody[bar][i],
      [0.2, 0.145, 0.17, 0.12][i],
      i % 2 ? 0.22 : -0.22,
    );
  }
  if (bar % 2 === 0) addNote(start + 2.75 * beat, chord[2] + 12, 0.055, 0.38);
}
// Circular room reflections preserve the release tails across the loop boundary.
const dryLeft = left.slice(),
  dryRight = right.slice();
for (const [delay, amount] of [
  [0.113, 0.13],
  [0.239, 0.075],
  [0.413, 0.04],
]) {
  const offset = Math.round(delay * rate);
  for (let i = 0; i < length; i++) {
    const source = (i - offset + length) % length;
    left[i] += dryRight[source] * amount;
    right[i] += dryLeft[source] * amount;
  }
}
let peak = 0;
for (let i = 0; i < length; i++)
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const wav = Buffer.alloc(44 + length * 4);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(length * 4, 40);
for (let i = 0; i < length; i++) {
  wav.writeInt16LE(Math.round((left[i] / peak) * 0.7 * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round((right[i] / peak) * 0.7 * 32767), 46 + i * 4);
}
const path = join(tmpdir(), "fun-quiz-curious-garden.wav");
writeFileSync(path, wav);
mkdirSync("public/audio", { recursive: true });
const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    path,
    "-codec:a",
    "libmp3lame",
    "-q:a",
    "4",
    "-metadata",
    "title=Curious Garden",
    "-metadata",
    "artist=Fun Quiz",
    "public/audio/curious-garden.mp3",
  ],
  { stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error("Install ffmpeg to encode the original soundtrack.");
console.log(
  `Rendered Curious Garden: ${seconds}s, 80 BPM, ${bars} bars. WAV preview: ${path}`,
);
