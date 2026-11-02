import { scoringFor } from "@/lib/live/scoring";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Copy,
  Pause,
  Play,
  Settings2,
  Square,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GameSettings } from "@/components/quiz/game-settings";
import { controlRoom } from "@/lib/live/client";
import {
  gameSettings,
  type HostAction,
  type RoomView,
} from "@/lib/live/protocol";
import { useLiveRoom, useRoomCountdown } from "@/lib/live/use-live-room";
import { useGameAudio } from "@/lib/live/use-game-audio";
import {
  ConnectionNotice,
  Leaderboard,
  LiveAnswers,
  LiveHeader,
  LiveTimer,
  RoomLoading,
  RoomUnavailable,
} from "./live-common";
import type { GameSettings as Settings } from "@/lib/quiz";
import { JoinQrCode } from "./join-qr-code";

export function HostGame({ code }: { code: string }) {
  const room = useLiveRoom(code, "host"),
    seconds = useRoomCountdown(room.snapshot, room.offset);
  const audio = useGameAudio(room.snapshot, room.offset, room.connected);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dialog, setDialog] = useState<"settings" | "end" | null>(null);
  async function control(action: HostAction) {
    setBusy(true);
    setError("");
    try {
      const next = await controlRoom(code, action);
      room.accept(next);
      return true;
    } catch (cause) {
      setError((cause as Error).message);
      room.reconnect();
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function showSettings() {
    if (
      room.snapshot?.deadline !== null &&
      !room.snapshot?.paused &&
      room.snapshot?.phase !== "lobby"
    ) {
      if (!(await control({ type: "pause" }))) return;
    }
    setDialog("settings");
  }
  if (["unauthorized", "closed"].includes(room.status))
    return (
      <RoomUnavailable
        code={code}
        host
        error={room.error}
        onRetry={room.reconnect}
      />
    );
  if (!room.snapshot) return <RoomLoading />;
  const snapshot = room.snapshot,
    ended = snapshot.phase === "finished" || snapshot.phase === "closed";
  return (
    <main className="live-page host-live">
      <LiveHeader
        code={code}
        host
        connected={room.connected}
        {...audio}
        onSound={() => {
          void audio.toggleSound();
        }}
        onMusic={() => {
          void audio.toggleMusic();
        }}
      />
      <ConnectionNotice
        connected={room.connected}
        error={room.error}
        onRetry={room.reconnect}
      />
      <div className="live-main">
        {snapshot.phase === "lobby" ? (
          <HostLobby
            snapshot={snapshot}
            disabled={busy || !room.connected}
            onStart={() => {
              void control({ type: "start" });
            }}
            onRemove={(playerId) => {
              void control({ type: "remove-player", playerId });
            }}
          />
        ) : ended ? (
          <HostFinish snapshot={snapshot} />
        ) : (
          <HostQuestion snapshot={snapshot} seconds={seconds} />
        )}
        {error && (
          <p className="live-action-error" role="alert">
            {error}
          </p>
        )}
        {!ended && (
          <HostControls
            snapshot={snapshot}
            disabled={busy || !room.connected}
            control={control}
            onSettings={() => {
              void showSettings();
            }}
            onEnd={() => setDialog("end")}
          />
        )}
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        {dialog === "settings" ? (
          <LiveSettings
            key={`${snapshot.questionIndex}:${dialog}`}
            initialSettings={snapshot.settings}
            paused={snapshot.paused}
            error={error}
            busy={busy}
            onSave={async (settings) => {
              if (await control({ type: "settings", settings }))
                setDialog(null);
            }}
          />
        ) : dialog === "end" ? (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Wrap up this round?</DialogTitle>
              <DialogDescription>
                The game will end for everyone. Answers submitted so far will
                count, and the results will be saved to your account.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Keep playing
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  if (await control({ type: "end" })) setDialog(null);
                }}
              >
                End game
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
      <footer className="live-footer">
        Your classroom. Your pace. One great question at a time.
      </footer>
    </main>
  );
}
function HostControls({
  snapshot,
  disabled,
  control,
  onSettings,
  onEnd,
}: {
  snapshot: RoomView;
  disabled: boolean;
  control: (action: HostAction) => Promise<boolean>;
  onSettings: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="host-control-bar">
      <div className="flex items-center gap-3">
        <Switch
          id="live-auto-advance"
          checked={snapshot.settings.progression === "automatic"}
          disabled={disabled}
          onCheckedChange={(checked) => {
            void control({
              type: "settings",
              settings: {
                ...snapshot.settings,
                progression: checked ? "automatic" : "manual",
              },
            });
          }}
        />
        <Label htmlFor="live-auto-advance">Automatic progression</Label>
      </div>
      <div className="host-action-buttons">
        <Button
          variant="outline"
          disabled={disabled || snapshot.phase === "question"}
          onClick={onSettings}
        >
          <Settings2 size={16} />
          Game settings
        </Button>
        {(snapshot.deadline !== null || snapshot.paused) && (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => {
              void control({
                type: snapshot.paused ? "resume" : "pause",
              });
            }}
          >
            {snapshot.paused ? <Play size={16} /> : <Pause size={16} />}
            {snapshot.paused ? "Resume" : "Pause"}
          </Button>
        )}
        {snapshot.phase === "question" && (
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => {
              void control({
                type: "reveal",
                questionIndex: snapshot.questionIndex,
              });
            }}
          >
            Reveal answer
          </Button>
        )}
        {snapshot.phase === "reveal" && (
          <Button
            disabled={disabled}
            onClick={() => {
              void control({
                type: "next",
                questionIndex: snapshot.questionIndex,
              });
            }}
          >
            {snapshot.questionIndex === snapshot.questionCount - 1
              ? "Finish game"
              : "Next question"}
            <ArrowRight size={16} />
          </Button>
        )}
        <Button variant="ghost" disabled={disabled} onClick={onEnd}>
          <Square size={14} />
          End game
        </Button>
      </div>
    </div>
  );
}

function HostQuestion({
  snapshot,
  seconds,
}: {
  snapshot: RoomView;
  seconds: number;
}) {
  return (
    <>
      <div className="host-question-meta">
        <span className="eyebrow">{snapshot.title}</span>
        <span>
          Question {snapshot.questionIndex + 1} of {snapshot.questionCount}
        </span>
        <strong>
          <Users size={16} />
          {snapshot.answeredCount} / {snapshot.playerCount} answers in
        </strong>
      </div>
      <section className="live-question-stage">
        <div className="live-question-top">
          <span className="eyebrow">
            {snapshot.phase === "reveal"
              ? "THE BIG REVEAL"
              : snapshot.paused
                ? "GAME PAUSED"
                : "LET’S GET THOSE NEURONS FIRING"}
          </span>
          <LiveTimer snapshot={snapshot} seconds={seconds} />
        </div>
        <h1>{snapshot.question?.prompt ?? "Your class is thinking…"}</h1>
        {snapshot.question?.answers ? (
          <LiveAnswers snapshot={snapshot} interactive={false} disabled />
        ) : (
          <p>Questions and answers are on student devices.</p>
        )}
        <p className="host-stage-status" role="status">
          {hostStatus(snapshot, seconds)}
        </p>
      </section>
      {snapshot.phase === "reveal" && (
        <Leaderboard
          scoring={scoringFor(snapshot)}
          players={snapshot.leaderboard}
        />
      )}
    </>
  );
}

function hostStatus(snapshot: RoomView, seconds: number) {
  if (snapshot.paused)
    return "A little breathing room. Resume whenever you’re ready.";
  if (snapshot.phase === "question")
    return "Answers lock when the timer ends. You can reveal early.";
  if (snapshot.deadline !== null)
    return snapshot.questionIndex === snapshot.questionCount - 1
      ? `Final results in ${seconds}s`
      : `Next question in ${seconds}s`;
  return "Take a moment to discuss. You decide when to move on.";
}
function HostLobby({
  snapshot,
  disabled,
  onStart,
  onRemove,
}: {
  snapshot: RoomView;
  disabled: boolean;
  onStart: () => void;
  onRemove: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const joinUrl = `${location.origin}/join?code=${snapshot.code}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
    } catch {
      document.querySelector<HTMLInputElement>("#live-join-link")?.select();
    }
  }
  return (
    <section className="host-lobby">
      <div className="host-lobby-intro">
        <span className="eyebrow">THE MORE CURIOUS, THE MERRIER</span>
        <h1>
          Get the whole room
          <br />
          <span>in on the fun.</span>
        </h1>
        <p>
          You’re hosting <strong>{snapshot.title}</strong>.<br />
          Invite your class, then let the good questions roll.
        </p>
      </div>
      <div className="game-code-board">
        <span>
          JOIN AT <strong>{location.host}/join</strong>
        </span>
        <span
          className="big-game-code"
          aria-label={`Game code ${snapshot.code}`}
        >
          {snapshot.code.slice(0, 3)} {snapshot.code.slice(3)}
        </span>
        <div className="join-link-row">
          <Input
            id="live-join-link"
            aria-label="Student join link"
            value={joinUrl}
            readOnly
          />
          <Button
            variant="secondary"
            aria-label="Copy join link"
            onClick={() => {
              void copy();
            }}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </Button>
        </div>
        {copied && (
          <small role="status">Join link copied. Spread the curiosity!</small>
        )}
        <JoinQrCode url={joinUrl} code={snapshot.code} />
      </div>
      <div className="lobby-roster-heading">
        <h2>
          <Users size={22} />
          {snapshot.playerCount}{" "}
          {snapshot.playerCount === 1 ? "player" : "players"} ready to play
          <span>{snapshot.connectedCount} connected</span>
        </h2>
        <Button
          size="lg"
          disabled={disabled || snapshot.connectedCount === 0}
          onClick={onStart}
        >
          Start game
          <Play size={17} fill="currentColor" />
        </Button>
      </div>
      <div className="lobby-roster">
        {snapshot.roster.length ? (
          snapshot.roster.map((player, index) => (
            <div
              className={`lobby-player player-color-${index % 4}`}
              key={player.id}
            >
              <span
                className={
                  player.connected ? "player-online" : "player-offline"
                }
              />
              <strong>{player.nickname}</strong>
              <button
                aria-label={`Remove ${player.nickname}`}
                disabled={disabled}
                onClick={() => onRemove(player.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-lobby">
            <Users size={31} />
            <p>A good game starts with good company.</p>
            <span>Players will appear here as they join.</span>
          </div>
        )}
      </div>
    </section>
  );
}
function LiveSettings({
  initialSettings,
  paused,
  error,
  busy,
  onSave,
}: {
  initialSettings: Settings;
  paused: boolean;
  error: string;
  busy: boolean;
  onSave: (settings: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initialSettings),
    [validation, setValidation] = useState("");
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Find your classroom rhythm.</DialogTitle>
        <DialogDescription>
          Display changes apply to the next question and stay until you change
          them again.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll">
        <GameSettings value={draft} onChange={setDraft} />
        {paused && (
          <p className="local-notice mt-5">
            The game is paused while you adjust things. Resume when you’re
            ready.
          </p>
        )}
        <p className="form-error mt-4" role="alert">
          {validation || error}
        </p>
      </div>
      <div className="dialog-footer">
        <span className="text-xs text-muted-foreground">
          Students will follow your settings.
        </span>
        <Button
          disabled={busy}
          onClick={() => {
            try {
              const clean = gameSettings(draft);
              void onSave(clean);
            } catch (cause) {
              setValidation((cause as Error).message);
            }
          }}
        >
          Apply settings
          <Check size={16} />
        </Button>
      </div>
    </DialogContent>
  );
}
function HostFinish({ snapshot }: { snapshot: RoomView }) {
  return (
    <>
      <section className="host-finish">
        <span className="eyebrow">GOOD QUESTIONS. GREAT COMPANY.</span>
        <h1>
          {snapshot.phase === "closed"
            ? "Until the next round."
            : "That’s some serious brain power."}
        </h1>
        <p>{snapshot.playerCount} curious minds made this round their own.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Button asChild variant="outline">
            <Link to="/">Back to library</Link>
          </Button>
          {snapshot.reportSaved ? (
            <Button asChild>
              <Link to="/reports/$id" params={{ id: snapshot.sessionId }}>
                Review game report
                <ArrowRight size={16} />
              </Link>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              Saving your report…
            </span>
          )}
        </div>
      </section>
      <Leaderboard
        scoring={scoringFor(snapshot)}
        players={snapshot.leaderboard}
        full
      />
    </>
  );
}
