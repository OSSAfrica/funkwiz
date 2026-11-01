import { Gamepad2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuizEditor } from "./quiz-editor";
import { ImportDialog } from "./import-dialog";
import { RehearsalDialog, SetupDialog } from "./rehearsal";
import { MigrationDialog } from "./migration-dialog";
import { exportQuiz } from "@/lib/quiz-store";
import type { GameSettings, Quiz } from "@/lib/quiz";

export type WorkspaceModal =
  | { type: "editor"; quiz: Quiz }
  | { type: "setup"; quiz: Quiz }
  | { type: "rehearsal"; quiz: Quiz; settings: GameSettings }
  | { type: "delete"; quiz: Quiz }
  | { type: "import" | "guide" }
  | { type: "migrate"; drafts: Quiz[] }
  | null;

type Props = {
  modal: WorkspaceModal;
  onChange: (modal: WorkspaceModal) => void;
  onSave: (quiz: Quiz) => Promise<void>;
  onDelete: (quiz: Quiz) => Promise<void>;
  onCopy: (quizzes: Quiz[]) => Promise<void>;
  busy: boolean;
  error: string;
};
export function WorkspaceDialog(props: Props) {
  return (
    <Dialog
      open={props.modal !== null}
      onOpenChange={(open) => {
        if (!open && !props.busy) props.onChange(null);
      }}
    >
      <ModalContent {...props} />
    </Dialog>
  );
}
function ModalContent({
  modal,
  onChange,
  onSave,
  onDelete,
  onCopy,
  busy,
  error,
}: Props) {
  if (!modal) return null;
  switch (modal.type) {
    case "editor":
      return (
        <QuizEditor key={modal.quiz.id} quiz={modal.quiz} onSave={onSave} />
      );
    case "import":
      return (
        <ImportDialog onReview={(quiz) => onChange({ type: "editor", quiz })} />
      );
    case "setup":
      return (
        <SetupDialog
          quiz={modal.quiz}
          onStart={(settings) =>
            onChange({ type: "rehearsal", quiz: modal.quiz, settings })
          }
        />
      );
    case "rehearsal":
      return (
        <RehearsalDialog
          quiz={modal.quiz}
          settings={modal.settings}
          onRestart={() => onChange({ type: "setup", quiz: modal.quiz })}
        />
      );
    case "guide":
      return <Guide />;
    case "migrate":
      return (
        <MigrationDialog
          drafts={modal.drafts}
          busy={busy}
          error={error}
          onCopy={onCopy}
        />
      );
    case "delete":
      return (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make room for new ideas?</DialogTitle>
            <DialogDescription>
              Remove “{modal.quiz.title}” from your account? Export a copy first
              if you want to keep it.
            </DialogDescription>
          </DialogHeader>
          <p className="form-error" role="alert">
            {error}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => exportQuiz(modal.quiz)}>
              Export a copy
            </Button>
            <Button variant="outline" onClick={() => onChange(null)}>
              Keep quiz
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                void onDelete(modal.quiz);
              }}
            >
              Remove quiz
            </Button>
          </div>
        </DialogContent>
      );
  }
}

function Guide() {
  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <span className="dialog-icon">
          <Gamepad2 />
        </span>
        <DialogTitle>Big fun. A few simple steps.</DialogTitle>
        <DialogDescription>
          Your quick guide to a classroom full of “aha!”
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll guide-steps">
        {[
          [
            "01",
            "Make it yours",
            "Create questions or import JSON from an AI tool. Review the answers, then save your quiz.",
          ],
          [
            "02",
            "Find your rhythm",
            "Apply one duration to all questions or customize each one. Choose manual progression, or automatic with a cooldown.",
          ],
          [
            "03",
            "Choose the view",
            "Show questions on the shared screen, student devices, or both. Change it between questions during a game.",
          ],
          [
            "04",
            "Take it for a spin",
            "Practice locally with the host and student screens. Test your timing before bringing the class together.",
          ],
        ].map(([number, title, text]) => (
          <div key={number}>
            <span>{number}</span>
            <section>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          </div>
        ))}
        <div className="local-notice">
          <ShieldCheck size={20} />
          <p>
            <strong>You’re exploring the first chapter.</strong> Your quizzes
            are saved to your teacher account. Export JSON for a backup. Live
            join codes and multiplayer are planned next.
          </p>
        </div>
      </div>
    </DialogContent>
  );
}
