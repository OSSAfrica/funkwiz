import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAudioPreferences } from "./audio-preferences";
test("new devices request music and effects while saved mutes remain off", () => {
  assert.equal(parseAudioPreferences(null).music, true);
  assert.equal(parseAudioPreferences(null).sound, true);
  const saved = parseAudioPreferences(
    '{"music":false,"sound":false,"timerSound":false,"musicVolume":0.25}',
  );
  assert.equal(saved.music, false);
  assert.equal(saved.sound, false);
  assert.equal(saved.timerSound, false);
  assert.equal(saved.musicVolume, 0.25);
});
test("broken or hostile preference data cannot break audio controls", () => {
  for (const raw of ["no-json", "null", "[]", '{"music":"true","sound":null}'])
    assert.equal(parseAudioPreferences(raw).music, true);
  assert.equal(
    parseAudioPreferences('{"musicVolume":999,"effectsVolume":-10}')
      .musicVolume,
    1,
  );
  assert.equal(
    parseAudioPreferences('{"musicVolume":999,"effectsVolume":-10}')
      .effectsVolume,
    0,
  );
});
