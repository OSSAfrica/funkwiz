import {
  ArrowDownToLine,
  BookOpen,
  Clock3,
  Copy,
  Share2,
  LockKeyhole,
  Pencil,
  Play,
  Radio,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizArt } from "./quiz-art";
import { exportQuiz } from "@/lib/quiz-store";
import { quizMinutes, type Quiz } from "@/lib/quiz";

export function QuizCard({
  quiz,
  onAction,
  school,
  busy,
}: {
  quiz: Quiz;
  school?: boolean;
  busy?: boolean;
  onAction: (
    type: "editor" | "setup" | "delete" | "host" | "copy" | "share",
    quiz: Quiz,
  ) => void;
}) {
  return (
    <article className="quiz-card" key={quiz.id}>
      <div className="quiz-cover">
        <QuizArt cover={quiz.cover} />
        <span className="cover-badge">
          {quiz.isExample
            ? "EXAMPLE QUIZ"
            : quiz.visibility === "workspace"
              ? "SHARED WITH WORKSPACE"
              : school
                ? "PRIVATE DRAFT"
                : "YOUR CREATION"}
        </span>
        <button
          className="cover-edit"
          aria-label={`${quiz.canEdit === false ? "Copy" : "Edit"} ${quiz.title}`}
          disabled={busy}
          onClick={() =>
            onAction(quiz.canEdit === false ? "copy" : "editor", quiz)
          }
        >
          <Pencil size={16} />
        </button>
      </div>
      <div className="quiz-card-body">
        <h3>{quiz.title}</h3>
        <p>
          {quiz.description ||
            "A fresh set of questions, ready for curious minds."}
        </p>
        <div className="quiz-meta">
          <span>
            <BookOpen size={14} />
            {quiz.questions.length} questions
          </span>
          <span>
            <Clock3 size={14} />~{quizMinutes(quiz)} min
          </span>
        </div>
        <div className="quiz-card-footer">
          <div className="quiz-play-actions">
            <Button
              size="sm"
              className="host-button"
              disabled={busy}
              onClick={() =>
                onAction(quiz.canEdit === false ? "copy" : "host", quiz)
              }
            >
              {quiz.canEdit === false ? (
                <Copy size={14} />
              ) : (
                <Radio size={14} />
              )}
              {quiz.canEdit === false ? "Copy to my drafts" : "Host live"}
            </Button>{" "}
            <Button
              className="practice-button"
              variant="outline"
              size="sm"
              onClick={() => onAction("setup", quiz)}
            >
              <Play size={14} fill="currentColor" />
              Practice
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Export ${quiz.title}`}
              onClick={() => exportQuiz(quiz)}
            >
              <ArrowDownToLine size={16} />
            </Button>
            {school && !quiz.isExample && quiz.canEdit !== false && (
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={
                  quiz.visibility === "workspace"
                    ? `Make ${quiz.title} private`
                    : `Share ${quiz.title} to workspace`
                }
                onClick={() => onAction("share", quiz)}
              >
                {quiz.visibility === "workspace" ? (
                  <LockKeyhole size={16} />
                ) : (
                  <Share2 size={16} />
                )}
              </Button>
            )}
            {!quiz.isExample && quiz.canEdit !== false && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${quiz.title}`}
                onClick={() => onAction("delete", quiz)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
