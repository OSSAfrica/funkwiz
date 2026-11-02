export type AudioPreferences = {
  sound: boolean;
  music: boolean;
  musicVolume: number;
  effectsVolume: number;
  timerSound: boolean;
};
export const AUDIO_PREFERENCES_KEY = "funkwiz:audio:v1";
export const defaultAudioPreferences: AudioPreferences = {
  sound: true,
  music: true,
  musicVolume: 0.6,
  effectsVolume: 0.65,
  timerSound: true,
};
export function parseAudioPreferences(raw: string | null): AudioPreferences {
  const preferences = { ...defaultAudioPreferences };
  try {
    const saved = JSON.parse(raw ?? "null");
    if (!saved || typeof saved !== "object") return preferences;
    for (const key of ["sound", "music", "timerSound"] as const)
      if (typeof saved[key] === "boolean") preferences[key] = saved[key];
    for (const key of ["musicVolume", "effectsVolume"] as const)
      if (typeof saved[key] === "number" && Number.isFinite(saved[key]))
        preferences[key] = Math.min(1, Math.max(0, saved[key]));
  } catch {
    /* A blocked or invalid preference never prevents joining a game. */
  }
  return preferences;
}
export function readAudioPreferences() {
  try {
    return parseAudioPreferences(localStorage.getItem(AUDIO_PREFERENCES_KEY));
  } catch {
    return { ...defaultAudioPreferences };
  }
}
export function saveAudioPreferences(preferences: AudioPreferences) {
  try {
    localStorage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    /* Controls still work when storage is unavailable. */
  }
}
