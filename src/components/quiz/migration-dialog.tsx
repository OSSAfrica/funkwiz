import { useState } from "react";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportQuiz } from "@/lib/quiz-store";
import type { Quiz } from "@/lib/quiz";

export function MigrationDialog({
  drafts,
  error,
  busy,
  onCopy,
}: {
  drafts: Quiz[];
  error: string;
  busy: boolean;
  onCopy: (quizzes: Quiz[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState(
    () => new Set(drafts.map((q) => q.id)),
  );
  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Bring your good ideas along.</DialogTitle>
        <DialogDescription>
          Choose browser drafts to copy into your teacher account. Your
          originals stay in this browser, and existing account quizzes won’t be
          overwritten.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll space-y-3">
        {drafts.length ? (
          drafts.map((quiz) => (
            <div className="migration-row" key={quiz.id}>
              <label>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selected.has(quiz.id)}
                  onChange={(e) =>
                    setSelected((previous) => {
                      const next = new Set(previous);
                      if (e.target.checked) next.add(quiz.id);
                      else next.delete(quiz.id);
                      return next;
                    })
                  }
                />
                <span>
                  <strong>{quiz.title}</strong>
                  <small>{quiz.questions.length} questions</small>
                </span>
              </label>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Export browser draft ${quiz.title}`}
                onClick={() => exportQuiz(quiz)}
              >
                <Download size={16} />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No uncopied browser drafts found. Your account is up to date.
          </p>
        )}
        <p role="alert" className="form-error">
          {error}
        </p>
      </div>
      <div className="dialog-footer">
        <span className="text-xs text-muted-foreground">
          Select up to 100 drafts per copy.
        </span>
        <Button
          disabled={busy || !selected.size || selected.size > 100}
          onClick={() => {
            void onCopy(drafts.filter((q) => selected.has(q.id)));
          }}
        >
          {busy
            ? "Copying…"
            : `Copy ${selected.size} ${selected.size === 1 ? "draft" : "drafts"}`}
          <ArrowRight size={16} />
        </Button>
      </div>
    </DialogContent>
  );
}
