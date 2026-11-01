import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Download,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameReport } from "@/lib/live/protocol";
import { Leaderboard, LiveBrand } from "./live-common";

export function GameReportScreen({ report }: { report: GameReport | null }) {
  function download() {
    if (!report) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `fun-quiz-report-${report.code}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!report)
    return (
      <main className="live-wait-page">
        <LiveBrand />
        <h1>This report isn’t ready yet.</h1>
        <p>
          It may still be saving, or this report isn’t in your teacher account.
        </p>
        <Button asChild>
          <Link to="/">Back to your library</Link>
        </Button>
      </main>
    );
  const answered = report.questions.reduce((sum, q) => sum + q.answered, 0),
    correct = report.questions.reduce((sum, q) => sum + q.correct, 0);
  return (
    <main className="report-page">
      <header className="report-header">
        <Link to="/" aria-label="Back to library">
          <LiveBrand />
        </Link>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft size={16} />
            Back to library
          </Link>
        </Button>
      </header>
      <div className="report-main">
        <div className="report-title">
          <div>
            <span className="eyebrow">AFTER THE “AHA!”</span>
            <h1>{report.title}</h1>
            <p>
              Game {report.code} ·{" "}
              {new Date(report.endedAt).toLocaleDateString("en-GB", {
                timeZone: "UTC",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <Button variant="outline" onClick={download}>
            <Download size={16} />
            Download report
          </Button>
        </div>
        <div className="report-stat-grid">
          <div>
            <Users size={22} />
            <strong>{report.playerCount}</strong>
            <span>Curious minds</span>
          </div>
          <div>
            <Target size={22} />
            <strong>
              {answered ? Math.round((correct / answered) * 100) : 0}%
            </strong>
            <span>Answer accuracy</span>
          </div>
          <div>
            <Trophy size={22} />
            <strong>{report.questions.filter((q) => q.asked).length}</strong>
            <span>Questions played</span>
          </div>
        </div>
        <Leaderboard players={report.leaderboard} full />
        <section className="question-review">
          <span className="eyebrow">TURN ANSWERS INTO INSIGHTS</span>
          <h2>A closer look at the questions.</h2>
          <p>See what clicked—and what could use another little “aha!”.</p>
          {report.questions.map((question, index) => (
            <article className="question-review-card" key={question.id}>
              <div className="review-question-heading">
                <span>Q{index + 1}</span>
                <h3>{question.prompt}</h3>
                <strong>
                  {question.asked
                    ? `${question.correct} / ${question.answered} correct`
                    : "Not asked"}
                </strong>
              </div>
              <div className="review-answer-list">
                {question.answers.map((answer, answerIndex) => (
                  <div
                    className={
                      question.correctIndex === answerIndex
                        ? "review-correct-answer"
                        : ""
                    }
                    key={["a", "b", "c", "d"][answerIndex]}
                  >
                    <span
                      className="review-answer-track"
                      style={{
                        transform: `scaleX(${question.answered ? question.counts[answerIndex] / question.answered : 0})`,
                      }}
                    />
                    <span>{answer}</span>
                    {question.correctIndex === answerIndex && (
                      <Check size={16} />
                    )}
                    <strong>{question.counts[answerIndex]}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
