import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomView } from "./protocol";
import { audioCues, audioScene } from "./audio-policy";
import {
  defaultAudioPreferences,
  readAudioPreferences,
  saveAudioPreferences,
  type AudioPreferences,
} from "./audio-preferences";
import { GameAudio } from "./game-audio";

export function useGameAudio(
  snapshot: RoomView | null,
  offset = 0,
  connected = true,
) {
  const [sound, setSound] = useState(false),
    [music, setMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.6),
    [effectsVolume, setEffectsVolume] = useState(0.65);
  const [timerSound, setTimerSound] = useState(true);
  const [musicBusy, setMusicBusy] = useState(false),
    [audioError, setAudioError] = useState("");
  const engine = useRef<GameAudio | null>(null),
    previous = useRef<RoomView | null>(null);
  const mounted = useRef(true);
  const preferences = useRef<AudioPreferences>({ ...defaultAudioPreferences });
  const autoAttempted = useRef(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const remember = useCallback((patch: Partial<AudioPreferences>) => {
    preferences.current = { ...preferences.current, ...patch };
    saveAudioPreferences(preferences.current);
  }, []);
  const soundRequestBusy = useRef(false),
    musicRequestBusy = useRef(false);
  const ensureEngine = useCallback(async () => {
    const current = (engine.current ??= new GameAudio());
    current.update(audioScene(snapshot, offset, connected, !document.hidden));
    current.setMusicVolume(musicVolume);
    current.setEffectsVolume(effectsVolume);
    current.setTimer(timerSound);
    current.setSound(sound);
    await current.resume();
    return current;
  }, [
    snapshot,
    offset,
    connected,
    musicVolume,
    effectsVolume,
    timerSound,
    sound,
  ]);
  const enableAudio = useCallback(async () => {
    try {
      const current = await ensureEngine();
      if (!mounted.current || engine.current !== current) return;
      setAutoplayBlocked(false);
      const prefs = preferences.current;
      current.setSound(prefs.sound);
      current.setTimer(prefs.timerSound);
      current.setMusicVolume(prefs.musicVolume);
      current.setEffectsVolume(prefs.effectsVolume);
      setSound(prefs.sound);
      setAudioError("");
      if (prefs.music) {
        setMusicBusy(true);
        try {
          await current.setMusic(true);
          if (mounted.current && engine.current === current)
            setMusic(preferences.current.music);
        } catch {
          if (mounted.current && preferences.current.music)
            setAudioError(
              "Music couldn’t load. Check your connection and try again.",
            );
        } finally {
          if (mounted.current) setMusicBusy(false);
        }
      }
    } catch {
      if (mounted.current) setAutoplayBlocked(true);
    }
  }, [ensureEngine]);
  const quiet = useCallback(() => {
    remember({ sound: false, music: false });
    engine.current?.setSound(false);
    void engine.current?.setMusic(false);
    setSound(false);
    setMusic(false);
    setAutoplayBlocked(false);
    setAudioError("");
  }, [remember]);
  useEffect(() => {
    if (!snapshot || autoAttempted.current) return;
    autoAttempted.current = true;
    const prefs = (preferences.current = readAudioPreferences());
    setMusicVolume(prefs.musicVolume);
    setEffectsVolume(prefs.effectsVolume);
    setTimerSound(prefs.timerSound);
    if (prefs.music || prefs.sound) void enableAudio();
  }, [snapshot, enableAudio]);
  const toggleSound = useCallback(async () => {
    if (soundRequestBusy.current) return;
    soundRequestBusy.current = true;
    try {
      const current =
        sound && engine.current ? engine.current : await ensureEngine();
      if (!mounted.current || engine.current !== current) return;
      current.setSound(!sound);
      remember({ sound: !sound });
      setAutoplayBlocked(false);
      setSound((value) => !value);
      setAudioError("");
    } catch {
      if (mounted.current)
        setAudioError(
          "Sound couldn’t start. Tap the sound control to try again.",
        );
    } finally {
      soundRequestBusy.current = false;
    }
  }, [ensureEngine, sound, remember]);
  const toggleMusic = useCallback(async () => {
    if (musicRequestBusy.current) return;
    musicRequestBusy.current = true;
    setMusicBusy(true);
    setAudioError("");
    try {
      const current =
        music && engine.current ? engine.current : await ensureEngine();
      remember({ music: !music });
      await current.setMusic(!music);
      setAutoplayBlocked(false);
      if (mounted.current && engine.current === current)
        setMusic((value) => !value);
    } catch {
      if (mounted.current) {
        setMusic(false);
        setAudioError(
          "Music couldn’t load. Check your connection and try again.",
        );
      }
    } finally {
      musicRequestBusy.current = false;
      if (mounted.current) setMusicBusy(false);
    }
  }, [ensureEngine, music, remember]);
  const changeMusicVolume = useCallback(
    (value: number) => {
      remember({ musicVolume: value });
      setMusicVolume(value);
      engine.current?.setMusicVolume(value);
    },
    [remember],
  );
  const changeEffectsVolume = useCallback(
    (value: number) => {
      remember({ effectsVolume: value });
      setEffectsVolume(value);
      engine.current?.setEffectsVolume(value);
    },
    [remember],
  );
  const changeTimerSound = useCallback(
    (value: boolean) => {
      remember({ timerSound: value });
      setTimerSound(value);
      engine.current?.setTimer(value);
    },
    [remember],
  );
  useEffect(() => {
    const update = () =>
      engine.current?.update(
        audioScene(snapshot, offset, connected, !document.hidden),
      );
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [snapshot, offset, connected]);
  useEffect(() => {
    if (snapshot)
      for (const cue of audioCues(previous.current, snapshot))
        engine.current?.cue(cue);
    previous.current = snapshot;
  }, [snapshot]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      engine.current?.close();
      engine.current = null;
    };
  }, []);
  return {
    sound,
    music,
    autoplayBlocked,
    enableAudio,
    quiet,
    stopCelebration: () => engine.current?.stopEffects(),
    toggleSound,
    toggleMusic,
    musicVolume,
    effectsVolume,
    timerSound,
    changeMusicVolume,
    changeEffectsVolume,
    changeTimerSound,
    musicBusy,
    audioError,
  };
}
