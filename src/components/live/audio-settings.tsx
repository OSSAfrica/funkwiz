import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";
import { SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { useGameAudio } from "@/lib/live/use-game-audio";

export type AudioControls = ReturnType<typeof useGameAudio>;
export function AudioSettings({ audio }: { audio: AudioControls }) {
  const hydrated = useHydrated();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="sound-control"
          aria-label="Audio settings"
          disabled={!hydrated}
        >
          <SlidersHorizontal size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="audio-settings-panel w-72"
        aria-label="Classroom audio settings"
      >
        <h2 className="font-bold">A little rhythm. Room to think.</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Your audio controls only affect this device.
        </p>
        <div className="audio-setting-row">
          <Label htmlFor="audio-music">Background music</Label>
          <Switch
            id="audio-music"
            checked={audio.music}
            disabled={audio.musicBusy}
            onCheckedChange={() => void audio.toggleMusic()}
          />
        </div>
        <Label htmlFor="music-volume" className="audio-volume-label">
          Music volume <span>{Math.round(audio.musicVolume * 100)}%</span>
        </Label>
        <input
          id="music-volume"
          className="audio-volume"
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(audio.musicVolume * 100)}
          onChange={(e) =>
            audio.changeMusicVolume(Number(e.target.value) / 100)
          }
        />
        <p className="text-xs text-muted-foreground">
          Curious Garden · soft marimba, 80 BPM. Music automatically lowers
          during questions and feedback.
        </p>
        <div className="audio-setting-row">
          <Label htmlFor="audio-effects">Sound effects</Label>
          <Switch
            id="audio-effects"
            checked={audio.sound}
            onCheckedChange={() => void audio.toggleSound()}
          />
        </div>
        <Label htmlFor="effects-volume" className="audio-volume-label">
          Effects volume <span>{Math.round(audio.effectsVolume * 100)}%</span>
        </Label>
        <input
          id="effects-volume"
          className="audio-volume"
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(audio.effectsVolume * 100)}
          onChange={(e) =>
            audio.changeEffectsVolume(Number(e.target.value) / 100)
          }
        />
        <div className="audio-setting-row">
          <Label htmlFor="audio-timer">Gentle clock ticks</Label>
          <Switch
            id="audio-timer"
            checked={audio.timerSound}
            onCheckedChange={audio.changeTimerSound}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Ticks follow the question timer when sound effects are on. Audio rests
          while paused, disconnected, or in a hidden tab.
        </p>
        {audio.audioError && (
          <p className="form-error mt-3" role="alert">
            {audio.audioError}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AudioNotice({
  audio,
}: {
  audio: Pick<
    AudioControls,
    "autoplayBlocked" | "musicBusy" | "audioError" | "enableAudio" | "quiet"
  >;
}) {
  if (!audio.autoplayBlocked && !audio.musicBusy && !audio.audioError)
    return null;
  const message = audio.autoplayBlocked
    ? "Your browser needs a tap to start the music."
    : audio.audioError || "Getting the music ready…";
  return (
    <div className="live-audio-notice" role="status">
      <span>{message}</span>
      {audio.autoplayBlocked && (
        <Button size="sm" onClick={() => void audio.enableAudio()}>
          Enable audio
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={audio.quiet}>
        Keep it quiet
      </Button>
    </div>
  );
}
