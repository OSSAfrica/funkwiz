import { scoringFor } from "@/lib/live/scoring";
import { ReportDownload } from "@/components/reports/report-download";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Target, Trophy, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameReport } from "@/lib/live/protocol";
import { Leaderboard, LiveBrand } from "./live-common";

export function GameReportScreen({ report }: { report: GameReport | null }) {
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
          <ReportDownload report={report} />
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
        <Leaderboard
          scoring={scoringFor(report)}
          players={report.leaderboard}
          full
        />
        <section className="question-review">
          <span className="eyebrow">TURN ANSWERS INTO INSIGHTS</span>
          <h2>A closer look at the questions.</h2>
          <p>
            Class totals: selected wrong choices are marked red, and the correct
            answer is labeled.
          </p>
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
                {question.answers.map((answer, answerIndex) => {
                  const correct = question.correctIndex === answerIndex;
                  const count = question.counts[answerIndex];
                  const selectedWrong = question.asked && count > 0 && !correct;
                  return (
                    <div
                      className={
                        correct
                          ? "review-correct-answer"
                          : selectedWrong
                            ? "review-incorrect-answer"
                            : ""
                      }
                      key={["a", "b", "c", "d"][answerIndex]}
                    >
                      <span
                        className="review-answer-track"
                        aria-hidden="true"
                        style={{
                          transform: `scaleX(${question.answered ? count / question.answered : 0})`,
                        }}
                      />
                      <span className="review-answer-copy">
                        <span>{answer}</span>
                        {correct && (
                          <small className="review-answer-status text-green-800">
                            <Check size={14} aria-hidden="true" />
                            Correct answer
                          </small>
                        )}
                        {selectedWrong && (
                          <small className="review-answer-status">
                            <X size={14} aria-hidden="true" />
                            Incorrect selection
                          </small>
                        )}
                      </span>
                      <strong>
                        {count}
                        <span className="sr-only">
                          {" "}
                          {count === 1 ? "response" : "responses"}
                        </span>
                      </strong>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
