import { useState } from "react";
import { Check, Clock3, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { covers, newQuestion, parseQuiz, type Quiz } from "@/lib/quiz";
import { cn } from "@/lib/utils";

const answerKeys = ["a", "b", "c", "d"] as const;

export function QuizEditor({
  quiz,
  onSave,
}: {
  quiz: Quiz;
  onSave: (quiz: Quiz) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Quiz>(() => structuredClone(quiz));
  const [active, setActive] = useState(0);
  const [uniform, setUniform] = useState(20);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const question = draft.questions[active];
  function patchQuestion(patch: Partial<typeof question>) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) =>
        i === active ? { ...q, ...patch } : q,
      ),
    }));
  }
  async function save() {
    setSaving(true);
    setError("");
    try {
      const clean = parseQuiz({
        ...draft,
        updatedAt: new Date().toISOString(),
        isExample: false,
      });
      await onSave(clean);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <DialogContent className="editor-dialog sm:max-w-4xl">
      <DialogHeader>
        <div className="eyebrow text-orange-700">
          A little prep. A lot of fun.
        </div>
        <DialogTitle>
          {quiz.title
            ? "Make this quiz your own"
            : "Create something quiz-worthy"}
        </DialogTitle>
        <DialogDescription>
          Add your questions, pick the answers, and set the pace.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll space-y-6" inert={saving}>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-3">
            <Label htmlFor="quiz-title">Quiz title</Label>
            <Input
              id="quiz-title"
              placeholder="Give your quiz a great name"
              value={draft.title}
              maxLength={120}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Label htmlFor="quiz-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="quiz-description"
              placeholder="What will your class discover?"
              value={draft.description}
              maxLength={500}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold">Cover color</legend>
            <div className="grid grid-cols-2 gap-2">
              {covers.map((cover) => (
                <button
                  type="button"
                  key={cover}
                  aria-label={`${cover} cover`}
                  aria-pressed={draft.cover === cover}
                  className={cn("cover-swatch", `art-${cover}`)}
                  onClick={() => setDraft({ ...draft, cover })}
                >
                  {draft.cover === cover ? <Check size={20} /> : null}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="timing-strip">
          <div className="flex items-center gap-2">
            <Clock3 size={18} />
            <strong>One time for every question?</strong>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="w-20"
              type="number"
              aria-label="Time to apply to all questions"
              min={5}
              max={300}
              value={uniform}
              onChange={(e) => setUniform(Number(e.target.value))}
            />
            <span className="text-sm">sec</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  !Number.isInteger(uniform) ||
                  uniform < 5 ||
                  uniform > 300
                ) {
                  setError("Choose 5–300 whole seconds.");
                  return;
                }
                setDraft((d) => ({
                  ...d,
                  questions: d.questions.map((q) => ({
                    ...q,
                    duration: uniform,
                  })),
                }));
                setError("");
              }}
            >
              Apply to all
            </Button>
          </div>
          <p>Or adjust each question below. New questions use this duration.</p>
        </div>
        <div className="question-editor">
          <div className="question-list" aria-label="Questions">
            {draft.questions.map((q, i) => (
              <button
                type="button"
                key={q.id}
                aria-current={i === active ? "step" : undefined}
                onClick={() => setActive(i)}
                className={cn("question-index", i === active && "selected")}
              >
                {i + 1}
                <span className="truncate">{q.prompt || "New question"}</span>
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              disabled={draft.questions.length >= 100}
              onClick={() => {
                const next = newQuestion();
                next.duration =
                  Number.isInteger(uniform) && uniform >= 5 && uniform <= 300
                    ? uniform
                    : 20;
                setDraft((d) => ({ ...d, questions: [...d.questions, next] }));
                setActive(draft.questions.length);
              }}
            >
              <Plus size={16} /> Add question
            </Button>
          </div>
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Question {active + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove current question"
                disabled={draft.questions.length === 1}
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    questions: d.questions.filter((_, i) => i !== active),
                  }));
                  setActive(Math.max(0, active - 1));
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <Label htmlFor="question-prompt">Question</Label>
            <Textarea
              id="question-prompt"
              placeholder="What would you like to ask?"
              value={question.prompt}
              maxLength={1000}
              onChange={(e) => patchQuestion({ prompt: e.target.value })}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-bold mb-2">
                Answers{" "}
                <span className="font-normal text-muted-foreground">
                  — select the correct one
                </span>
              </legend>
              {question.answers.map((answer, i) => (
                <div
                  className={cn(
                    "answer-editor",
                    question.correctIndex === i && "correct",
                  )}
                  key={answerKeys[i]}
                >
                  <input
                    aria-label={`Answer ${i + 1} is correct`}
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctIndex === i}
                    onChange={() => patchQuestion({ correctIndex: i })}
                  />
                  <Input
                    aria-label={`Answer ${i + 1}`}
                    placeholder={`Answer ${i + 1}`}
                    value={answer}
                    maxLength={240}
                    onChange={(e) =>
                      patchQuestion({
                        answers: question.answers.map((a, j) =>
                          i === j ? e.target.value : a,
                        ),
                      })
                    }
                  />
                  {question.correctIndex === i && (
                    <Check size={17} className="text-emerald-700 shrink-0" />
                  )}
                </div>
              ))}
            </fieldset>
            <div className="flex items-center gap-3">
              <Label htmlFor="question-duration">Time limit</Label>
              <Input
                id="question-duration"
                className="w-24"
                type="number"
                min={5}
                max={300}
                value={question.duration}
                onChange={(e) =>
                  patchQuestion({ duration: Number(e.target.value) })
                }
              />
              <span className="text-sm text-muted-foreground">
                seconds (5–300)
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="dialog-footer">
        <p
          className={error ? "form-error" : "text-sm text-muted-foreground"}
          role={error ? "alert" : undefined}
        >
          {error || "Your quiz will be saved to your teacher account."}
        </p>
        <Button onClick={save} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving…" : "Save quiz"}
        </Button>
      </div>
    </DialogContent>
  );
}
