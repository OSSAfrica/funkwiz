import { useEffect, useReducer, useState, type Dispatch } from "react";
import {
  ArrowRight,
  Check,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GameSettings, DisplayOptions } from "./game-settings";
import {
  beginRehearsal,
  rehearsalReducer,
  type Rehearsal,
  type GameAction,
} from "@/lib/rehearsal";
import {
  defaultSettings,
  type GameSettings as Settings,
  type Quiz,
} from "@/lib/quiz";
import { cn } from "@/lib/utils";

type GameDispatch = Dispatch<GameAction>;
const answerShapes = ["▲", "◆", "●", "■"] as const;

export function SetupDialog({
  quiz,
  onStart,
}: {
  quiz: Quiz;
  onStart: (settings: Settings) => void;
}) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const valid =
    Number.isInteger(settings.cooldown) &&
    settings.cooldown >= 1 &&
    settings.cooldown <= 60;
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <span className="eyebrow text-orange-700">Set the scene</span>
        <DialogTitle>Every class has its own rhythm.</DialogTitle>
        <DialogDescription>
          Choose how you’ll play “{quiz.title}”. You can change display and
          progression between questions.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll">
        <GameSettings value={settings} onChange={setSettings} />
        <div className="local-notice mt-6">
          <Play size={18} />
          <p>
            <strong>Give it a practice run.</strong> This is a local rehearsal
            with host and student views. Multiplayer rooms are coming in the
            next phase.
          </p>
        </div>
      </div>
      <div className="dialog-footer">
        <span className="text-sm text-muted-foreground">
          {quiz.questions.length} questions · No players connected
        </span>
        <Button
          disabled={settings.progression === "automatic" && !valid}
          onClick={() => onStart(settings)}
        >
          Start rehearsal
          <ArrowRight size={16} />
        </Button>
      </div>
    </DialogContent>
  );
}

export function RehearsalDialog({
  quiz,
  settings,
  onRestart,
}: {
  quiz: Quiz;
  settings: Settings;
  onRestart: () => void;
}) {
  const [state, dispatch] = useReducer(rehearsalReducer, undefined, () =>
    beginRehearsal(quiz, settings, Date.now()),
  );
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (state.phase === "finished" || state.paused) return;
    const interval = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      dispatch({ type: "tick", now: time });
    }, 200);
    return () => window.clearInterval(interval);
  }, [state.phase, state.paused]);
  return (
    <DialogContent className="rehearsal-dialog sm:max-w-4xl">
      <DialogHeader>
        <div className="eyebrow text-orange-700">Practice makes playful</div>
        <DialogTitle>{quiz.title}</DialogTitle>
        <DialogDescription>
          Local rehearsal · Try both screens and test the pace. No students are
          connected.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll">
        {state.phase === "finished" ? (
          <FinishedRehearsal quiz={quiz} onRestart={onRestart} />
        ) : (
          <QuestionRehearsal state={state} now={now} dispatch={dispatch} />
        )}
      </div>
    </DialogContent>
  );
}

function QuestionRehearsal({
  state,
  now,
  dispatch,
}: {
  state: Rehearsal;
  now: number;
  dispatch: GameDispatch;
}) {
  const [view, setView] = useState("host");
  const q = state.quiz.questions[state.index];
  const seconds = Math.max(
    0,
    Math.ceil(
      (state.paused ? state.remaining : (state.deadline ?? now) - now) / 1000,
    ),
  );
  const showContent =
    state.phase !== "question" ||
    state.display === "both" ||
    (view === "host"
      ? state.display === "shared"
      : state.display === "devices");
  const heading = showContent
    ? q.prompt
    : view === "student"
      ? "Eyes on the shared screen!"
      : "Your class is thinking…";
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="host">
              <Monitor size={16} />
              Host screen
            </TabsTrigger>
            <TabsTrigger value="student">
              <Smartphone size={16} />
              Student screen
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-sm font-bold text-muted-foreground">
          Question {state.index + 1} of {state.quiz.questions.length}
        </span>
      </div>
      <section
        className={cn("game-stage", state.phase === "reveal" && "is-revealed")}
      >
        <StageHeader state={state} seconds={seconds} />
        <h3>{heading}</h3>
        {!showContent && (
          <p>
            {view === "student"
              ? "Choose your answer below."
              : "Questions and answers are on student devices."}
          </p>
        )}
        {(view === "student" || showContent) && (
          <GameAnswers
            state={state}
            view={view}
            showContent={showContent}
            dispatch={dispatch}
          />
        )}
        <p className="game-status" role="status">
          {statusText(state, seconds, view)}
        </p>
      </section>
      <RuntimeControls state={state} dispatch={dispatch} />
    </>
  );
}
function StageHeader({
  state,
  seconds,
}: {
  state: Rehearsal;
  seconds: number;
}) {
  const label =
    state.phase === "reveal"
      ? "THE BIG REVEAL"
      : state.paused
        ? "TAKE A BREATHER"
        : "LET’S THINK ABOUT IT";
  return (
    <div className="game-stage-top">
      <span>{label}</span>
      <span className="game-timer">
        {state.paused ? (
          <Pause size={16} />
        ) : state.deadline !== null ? (
          `${seconds}s`
        ) : (
          <Check size={20} />
        )}
      </span>
    </div>
  );
}
function GameAnswers({
  state,
  view,
  showContent,
  dispatch,
}: {
  state: Rehearsal;
  view: string;
  showContent: boolean;
  dispatch: GameDispatch;
}) {
  const q = state.quiz.questions[state.index];
  const disabled =
    view === "host" ||
    state.phase !== "question" ||
    state.paused ||
    state.answer !== null;
  return (
    <div className="game-answers">
      {q.answers.map((answer, i) => {
        const revealed = state.phase === "reveal";
        const correct = q.correctIndex === i;
        const chosen = state.answer === i;
        return (
          <button
            type="button"
            key={answerShapes[i]}
            disabled={disabled}
            onClick={() => dispatch({ type: "answer", answer: i })}
            className={cn(
              "game-answer",
              `answer-${i}`,
              chosen && "chosen",
              revealed && correct && "right-answer",
              revealed && !correct && "wrong-answer",
            )}
          >
            <span className="answer-shape" aria-hidden="true">
              {answerShapes[i]}
            </span>
            <span>{showContent ? answer : `Answer ${i + 1}`}</span>
            {((revealed && correct) || (!revealed && chosen)) && (
              <Check size={23} />
            )}
            <span className="sr-only">
              {revealed && correct ? "Correct answer" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
function RuntimeControls({
  state,
  dispatch,
}: {
  state: Rehearsal;
  dispatch: GameDispatch;
}) {
  const update = (settings: Settings) =>
    dispatch({ type: "settings", settings, now: Date.now() });
  const last = state.index === state.quiz.questions.length - 1;
  return (
    <>
      <div className="rehearsal-controls">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-advance"
            checked={state.settings.progression === "automatic"}
            onCheckedChange={(checked) =>
              update({
                ...state.settings,
                progression: checked ? "automatic" : "manual",
              })
            }
          />
          <Label htmlFor="auto-advance">Automatic progression</Label>
        </div>
        <div className="flex gap-2">
          {(state.deadline !== null || state.paused) && (
            <Button
              variant="outline"
              onClick={() => dispatch({ type: "pause", now: Date.now() })}
            >
              {state.paused ? <Play size={16} /> : <Pause size={16} />}
              {state.paused ? "Resume" : "Pause"}
            </Button>
          )}
          {state.phase === "question" ? (
            <Button
              variant="outline"
              onClick={() => dispatch({ type: "reveal", now: Date.now() })}
            >
              Reveal answer
            </Button>
          ) : (
            <Button onClick={() => dispatch({ type: "next", now: Date.now() })}>
              {last ? "Finish rehearsal" : "Next question"}
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
      {state.phase === "reveal" && !last && (
        <div className="next-display">
          <DisplayOptions
            value={state.settings.display}
            onChange={(display) => update({ ...state.settings, display })}
          />
          <p>Applies to the next question and stays until you change it.</p>
        </div>
      )}
    </>
  );
}
function statusText(state: Rehearsal, seconds: number, view: string) {
  if (state.paused) return "Paused. Pick up right where you left off.";
  if (state.phase === "reveal") {
    const last = state.index === state.quiz.questions.length - 1;
    if (state.deadline !== null)
      return `${last ? "Finishing" : "Next question"} in ${seconds} seconds`;
    return last
      ? "That’s the last one! Finish when you’re ready."
      : "Take a moment to discuss. You decide when to move on.";
  }
  if (state.answer !== null) return "Answer locked in. Let’s see how you did!";
  return view === "student"
    ? "Choose one answer. You’ve got this!"
    : "The question timer is running.";
}
function FinishedRehearsal({
  quiz,
  onRestart,
}: {
  quiz: Quiz;
  onRestart: () => void;
}) {
  return (
    <div className="rehearsal-finished">
      <span className="trophy-bubble">
        <Trophy size={45} />
      </span>
      <h3>You’re ready to bring the fun.</h3>
      <p>
        Rehearsal complete! Your {quiz.questions.length} questions are ready for
        another run.
      </p>
      <p className="text-sm">
        Live student joining and scores will arrive with multiplayer.
      </p>
      <Button onClick={onRestart}>
        <RotateCcw size={16} />
        Back to setup
      </Button>
    </div>
  );
}
