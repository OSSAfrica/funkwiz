import { useHydrated } from "@/lib/use-hydrated";
import { AudioSettings, type AudioControls } from "./audio-settings";
import { Link } from "@tanstack/react-router";
import {
  Check,
  CircleHelp,
  LoaderCircle,
  Music2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RankedPlayer, RoomView } from "@/lib/live/protocol";

export function LiveBrand() {
  return (
    <span className="live-brand">
      <span className="brand-mark">
        <Zap size={23} fill="currentColor" />
      </span>
      <span>
        fun<span>kwiz</span>.
      </span>
    </span>
  );
}
export function LiveHeader({
  code,
  host,
  connected,
  sound,
  music,
  onSound,
  onMusic,
  ...audioSettings
}: {
  code: string;
  host: boolean;
  connected: boolean;
  sound: boolean;
  music: boolean;
  onSound: () => void;
  onMusic: () => void;
} & AudioControls) {
  const hydrated = useHydrated();
  return (
    <header className="live-header">
      <Link
        to={host ? "/" : "/join"}
        search={host ? undefined : { code: undefined }}
        aria-label={host ? "Back to your library" : "Join another game"}
      >
        <LiveBrand />
      </Link>
      <div className="live-header-right">
        <span className="live-code-chip">
          GAME <strong>{code}</strong>
        </span>
        <span
          className={cn("connection-chip", !connected && "offline")}
          role="status"
        >
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{connected ? "Connected" : "Reconnecting"}</span>
        </span>
        <button
          className={cn("sound-control", sound && "enabled")}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          aria-pressed={sound}
          disabled={!hydrated}
          onClick={onSound}
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
        <button
          className={cn("sound-control", music && "enabled")}
          aria-label={music ? "Turn music off" : "Turn music on"}
          aria-pressed={music}
          disabled={!hydrated || audioSettings.musicBusy}
          onClick={onMusic}
        >
          <Music2 size={18} />
        </button>
        <AudioSettings audio={{ ...audioSettings, sound, music }} />
      </div>
    </header>
  );
}
export function RoomLoading() {
  return (
    <main className="live-wait-page">
      <LiveBrand />
      <span className="live-loading-icon">
        <LoaderCircle className="animate-spin" size={34} />
      </span>
      <h1>Finding your room…</h1>
      <p>A little anticipation. A lot of fun ahead.</p>
    </main>
  );
}
export function RoomUnavailable({
  code,
  host,
  error,
  onRetry,
}: {
  code: string;
  host: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <main className="live-wait-page">
      <LiveBrand />
      <span className="live-loading-icon">
        <CircleHelp size={35} />
      </span>
      <h1>Let’s find your way back.</h1>
      <p role="alert">{error || "This room could not be reached."}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="outline" asChild>
          {host ? (
            <Link to="/login" search={{}}>
              Teacher sign-in
            </Link>
          ) : (
            <Link to="/join" search={{ code }}>
              Join the game
            </Link>
          )}
        </Button>
      </div>
    </main>
  );
}
export function Leaderboard({
  players,
  selfId,
  full = false,
}: {
  players: RankedPlayer[];
  selfId?: string;
  full?: boolean;
}) {
  return (
    <section
      className={cn("live-leaderboard", full && "full-leaderboard")}
      aria-label="Leaderboard"
    >
      <div className="live-section-heading">
        <span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span>
        <h2>{full ? "Every curious mind counts." : "The leaderboard"}</h2>
      </div>
      {players.length ? (
        <ol>
          {players.map((player) => (
            <li
              className={cn(player.id === selfId && "is-you")}
              key={player.id}
            >
              <span className={cn("rank-badge", `rank-${player.rank}`)}>
                {player.rank <= 3
                  ? ["🥇", "🥈", "🥉"][player.rank - 1]
                  : player.rank}
              </span>
              <strong>
                {player.nickname}
                {player.id === selfId && <small>You</small>}
              </strong>
              <span>
                {player.score.toLocaleString()} <small>pts</small>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          The first scores are just around the corner.
        </p>
      )}
      <p className="scoring-note">
        1,000 points per correct answer. Equal scores share a rank.
      </p>
    </section>
  );
}
const answerShapes = ["▲", "◆", "●", "■"] as const;
export function LiveAnswers({
  snapshot,
  interactive,
  disabled,
  onAnswer,
}: {
  snapshot: RoomView;
  interactive: boolean;
  disabled: boolean;
  onAnswer?: (index: number) => void;
}) {
  const q = snapshot.question;
  if (!q) return null;
  const revealed = snapshot.phase === "reveal";
  return (
    <div className="live-answer-grid">
      {answerShapes.map((shape, index) => {
        const correct = revealed && q.correctIndex === index,
          chosen = snapshot.self?.answer === index;
        const className = cn(
          "live-answer",
          `answer-${index}`,
          revealed && !correct && "wrong-answer",
          correct && "right-answer",
          chosen && "chosen",
        );
        const content = (
          <>
            <span className="answer-shape" aria-hidden="true">
              {shape}
            </span>
            <span>{q.answers?.[index] ?? `Answer ${index + 1}`}</span>
            {(correct || chosen) && <Check size={24} />}
            <span className="sr-only">{correct ? "Correct answer" : ""}</span>
            {revealed && (
              <small className="answer-tally">
                {q.counts?.[index] ?? 0}{" "}
                {q.counts?.[index] === 1 ? "answer" : "answers"}
              </small>
            )}
          </>
        );
        return interactive ? (
          <button
            type="button"
            key={shape}
            className={className}
            aria-pressed={chosen}
            disabled={disabled}
            onClick={() => onAnswer?.(index)}
          >
            {content}
          </button>
        ) : (
          <div key={shape} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
export function ConnectionNotice({
  connected,
  error,
  onRetry,
}: {
  connected: boolean;
  error: string;
  onRetry: () => void;
}) {
  return connected ? null : (
    <div className="live-connection-notice" role="status">
      <WifiOff size={17} />
      <span>
        {error ||
          "Connection interrupted. Your place and answers are saved while we reconnect."}
      </span>
      <button onClick={onRetry}>Reconnect</button>
    </div>
  );
}

export function LiveTimer({
  snapshot,
  seconds,
}: {
  snapshot: RoomView;
  seconds: number;
}) {
  return (
    <span
      className="live-timer"
      aria-label={
        snapshot.paused ? "Timer paused" : `${seconds} seconds remaining`
      }
    >
      {snapshot.paused ? (
        "Ⅱ"
      ) : snapshot.deadline !== null ? (
        seconds
      ) : (
        <Check size={25} />
      )}
    </span>
  );
}
