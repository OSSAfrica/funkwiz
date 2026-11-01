import {
  ArrowDownToLine,
  BookOpen,
  Clock3,
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
}: {
  quiz: Quiz;
  onAction: (type: "editor" | "setup" | "delete" | "host", quiz: Quiz) => void;
}) {
  return (
    <article className="quiz-card" key={quiz.id}>
      <div className="quiz-cover">
        <QuizArt cover={quiz.cover} />
        <span className="cover-badge">
          {quiz.isExample ? "EXAMPLE QUIZ" : "YOUR CREATION"}
        </span>
        <button
          className="cover-edit"
          aria-label={`Edit ${quiz.title}`}
          onClick={() => onAction("editor", quiz)}
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
              onClick={() => onAction("host", quiz)}
            >
              <Radio size={14} />
              Host live
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
            {!quiz.isExample && (
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
