import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Zap } from "lucide-react";
import { HeroArt } from "@/components/quiz/quiz-art";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <Zap size={26} fill="currentColor" />
          </span>
          <span>
            fun<span className="brand-second">kwiz</span>
            <span className="brand-dot">.</span>
          </span>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">FOR THE MAKERS OF “AHA!” MOMENTS</span>
          <h1>
            Great questions
            <br />
            start with <span>you.</span>
          </h1>
          <p>
            A little curiosity. A splash of friendly competition.
            <br />A classroom that can’t wait for the next question.
          </p>
          <HeroArt />
        </div>
        <p className="auth-story-footer">
          Made for curious minds & happy classrooms.
        </p>
      </section>
      <section className="auth-form-side">{children}</section>
      <div className="student-join-from-login">
        <Link to="/join" search={{}}>
          Joining a classroom game? Enter your code <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
