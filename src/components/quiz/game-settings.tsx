import {
  Monitor,
  PanelsTopLeft,
  Smartphone,
  Timer,
  MousePointer2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  displayLabels,
  type DisplayMode,
  type GameSettings as Settings,
} from "@/lib/quiz";

export function DisplayOptions({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (value: DisplayMode) => void;
}) {
  const icons = { shared: Monitor, devices: Smartphone, both: PanelsTopLeft };
  return (
    <fieldset>
      <legend className="setting-label">Where should questions appear?</legend>
      <div className="display-options">
        {(["shared", "devices", "both"] as const).map((mode) => {
          const Icon = icons[mode];
          return (
            <label
              key={mode}
              className={cn("display-option", value === mode && "selected")}
            >
              <input
                className="sr-only"
                type="radio"
                name="display-mode"
                value={mode}
                checked={value === mode}
                onChange={() => onChange(mode)}
              />
              <Icon size={24} />
              <strong>{displayLabels[mode]}</strong>
              <span>
                {mode === "shared"
                  ? "Answer buttons on phones"
                  : mode === "devices"
                    ? "Questions on every phone"
                    : "Everyone gets the full view"}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
export function GameSettings({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
}) {
  return (
    <div className="space-y-6">
      <DisplayOptions
        value={value.display}
        onChange={(display) => onChange({ ...value, display })}
      />
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="allow-answer-changes">Allow answer changes</Label>
          <Switch
            id="allow-answer-changes"
            checked={value.allowAnswerChanges === true}
            onCheckedChange={(allowAnswerChanges) =>
              onChange({ ...value, allowAnswerChanges })
            }
            aria-describedby="answer-changes-help"
          />
        </div>
        <p
          id="answer-changes-help"
          className="mt-2 text-sm text-muted-foreground"
        >
          {value.allowAnswerChanges
            ? "Players can change their choice until time runs out or you reveal the answer. Their final choice sets their scoring position."
            : "Each player’s first answer is locked in."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Set this for the quiz here, or adjust it between questions in Game
          settings.
        </p>
      </div>
      <fieldset>
        <legend className="setting-label">Who keeps the game moving?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["manual", "automatic"] as const).map((mode) => (
            <label
              key={mode}
              className={cn(
                "progression-option",
                value.progression === mode && "selected",
              )}
            >
              <input
                className="sr-only"
                type="radio"
                name="progression"
                checked={value.progression === mode}
                onChange={() => onChange({ ...value, progression: mode })}
              />
              {mode === "manual" ? (
                <MousePointer2 size={21} />
              ) : (
                <Timer size={21} />
              )}
              <strong>
                {mode === "manual" ? "I’ll lead the way" : "Keep it rolling"}
              </strong>
              <span>
                {mode === "manual"
                  ? "You start each next question."
                  : "Move on after a short cooldown."}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div
        className={cn(
          "cooldown-control",
          value.progression === "manual" && "is-disabled",
        )}
      >
        <div>
          <Label htmlFor="cooldown">Cooldown between questions</Label>
          <p>
            {value.progression === "manual"
              ? "Disabled in manual mode. Take all the time you need."
              : "A little breathing room to reveal and discuss the answer."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="cooldown"
            type="number"
            min={1}
            max={60}
            className="w-20"
            disabled={value.progression === "manual"}
            value={value.cooldown}
            onChange={(e) =>
              onChange({ ...value, cooldown: Number(e.target.value) })
            }
          />
          <span>sec</span>
        </div>
      </div>
    </div>
  );
}
