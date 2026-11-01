import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomView } from "./protocol";
export function useGameAudio(snapshot: RoomView | null) {
  const [sound, setSound] = useState(false),
    [music, setMusic] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const lastCue = useRef("");
  const ensureContext = useCallback(async () => {
    if (!context.current) context.current = new AudioContext();
    if (context.current.state === "suspended") await context.current.resume();
    return context.current;
  }, []);
  const play = useCallback((notes: number[], volume = 0.045) => {
    const audio = context.current;
    if (!audio || audio.state !== "running") return;
    notes.forEach((note, index) => {
      const oscillator = audio.createOscillator(),
        gain = audio.createGain(),
        start = audio.currentTime + index * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
  }, []);
  const toggleSound = useCallback(async () => {
    try {
      await ensureContext();
      setSound((value) => !value);
    } catch {
      setSound(false);
    }
  }, [ensureContext]);
  const toggleMusic = useCallback(async () => {
    try {
      await ensureContext();
      setMusic((value) => !value);
    } catch {
      setMusic(false);
    }
  }, [ensureContext]);
  useEffect(() => {
    if (!snapshot) return;
    const cue = `${snapshot.phase}:${snapshot.questionIndex}:${snapshot.self?.answer ?? ""}`;
    if (cue === lastCue.current) return;
    lastCue.current = cue;
    if (!sound) return;
    if (snapshot.phase === "finished") play([392, 494, 587, 784]);
    else if (snapshot.phase === "reveal")
      play(snapshot.self?.correct === false ? [330, 262] : [523, 659, 784]);
    else if (
      snapshot.self?.answer !== null &&
      snapshot.self?.answer !== undefined
    )
      play([659, 784]);
    else if (snapshot.phase === "question") play([392, 523]);
  }, [snapshot, sound, play]);
  const phase = snapshot?.phase,
    paused = snapshot?.paused;
  useEffect(() => {
    if (!music || !phase || paused || ["finished", "closed"].includes(phase))
      return;
    const pattern = () => play([262, 330, 392, 330], 0.012);
    pattern();
    const timer = setInterval(pattern, 3500);
    return () => clearInterval(timer);
  }, [music, phase, paused, play]);
  useEffect(
    () => () => {
      if (context.current) void context.current.close().catch(() => {});
    },
    [],
  );
  return { sound, music, toggleSound, toggleMusic };
}
