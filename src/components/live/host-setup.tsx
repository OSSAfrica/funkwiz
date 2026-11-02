import { DEFAULT_SCORING, scoringSummary } from "@/lib/live/scoring";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameSettings } from "@/components/quiz/game-settings";
import {
  defaultSettings,
  type Quiz,
  type GameSettings as Settings,
} from "@/lib/quiz";
import { gameSettings } from "@/lib/live/protocol";
export function HostSetupDialog({
  quiz,
  onHost,
}: {
  quiz: Quiz;
  onHost: (settings: Settings) => Promise<void>;
}) {
  const [settings, setSettings] = useState(defaultSettings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function host() {
    setBusy(true);
    setError("");
    try {
      await onHost(gameSettings(settings));
    } catch (cause) {
      setError(
        (cause as Error).message ||
          "Your room could not be opened. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <span className="eyebrow text-orange-700">
          BRING THE WHOLE CLASS ALONG
        </span>
        <DialogTitle>A little friendly competition?</DialogTitle>
        <DialogDescription>
          Get “{quiz.title}” ready for your class. You’ll get a game code and a
          lobby before the first question starts.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll" inert={busy}>
        <GameSettings value={settings} onChange={setSettings} />
        <div className="local-notice mt-5">
          <Users size={20} />
          <p>
            <strong>No student accounts needed.</strong> Players join with your
            game code and a nickname. {scoringSummary(DEFAULT_SCORING)}
          </p>
        </div>
        <p className="form-error mt-4" role="alert">
          {error}
        </p>
      </div>
      <div className="dialog-footer">
        <span className="text-sm text-muted-foreground">
          {quiz.questions.length} questions · Your class, your pace
        </span>
        <Button
          onClick={() => {
            void host();
          }}
          disabled={busy}
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {busy ? "Opening your room…" : "Open live lobby"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </DialogContent>
  );
}
