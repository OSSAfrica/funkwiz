import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomView } from "./protocol";
import { audioCues, audioScene } from "./audio-policy";
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
  const toggleSound = useCallback(async () => {
    if (soundRequestBusy.current) return;
    soundRequestBusy.current = true;
    try {
      const current =
        sound && engine.current ? engine.current : await ensureEngine();
      if (!mounted.current || engine.current !== current) return;
      current.setSound(!sound);
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
  }, [ensureEngine, sound]);
  const toggleMusic = useCallback(async () => {
    if (musicRequestBusy.current) return;
    musicRequestBusy.current = true;
    setMusicBusy(true);
    setAudioError("");
    try {
      const current =
        music && engine.current ? engine.current : await ensureEngine();
      await current.setMusic(!music);
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
  }, [ensureEngine, music]);
  const changeMusicVolume = useCallback((value: number) => {
    setMusicVolume(value);
    engine.current?.setMusicVolume(value);
  }, []);
  const changeEffectsVolume = useCallback((value: number) => {
    setEffectsVolume(value);
    engine.current?.setEffectsVolume(value);
  }, []);
  const changeTimerSound = useCallback((value: boolean) => {
    setTimerSound(value);
    engine.current?.setTimer(value);
  }, []);
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
