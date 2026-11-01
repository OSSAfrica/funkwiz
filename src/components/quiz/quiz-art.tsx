import { Atom, Globe2, Leaf, Orbit, Sparkles, Star, Zap } from "lucide-react";
import type { Cover } from "@/lib/quiz";
import { cn } from "@/lib/utils";

export function QuizArt({
  cover,
  className,
}: {
  cover: Cover;
  className?: string;
}) {
  return (
    <div
      className={cn("quiz-art", `art-${cover}`, className)}
      aria-hidden="true"
    >
      <span className="art-orbit orbit-one" />
      <span className="art-orbit orbit-two" />
      <Star className="art-star star-one" size={20} fill="currentColor" />
      <Sparkles className="art-star star-two" size={27} />
      <span className="art-dot dot-one" />
      <span className="art-dot dot-two" />
      <div className="art-main">
        {cover === "space" ? (
          <Orbit size={100} strokeWidth={1.4} />
        ) : cover === "nature" ? (
          <Leaf size={94} strokeWidth={1.5} />
        ) : cover === "world" ? (
          <Globe2 size={96} strokeWidth={1.4} />
        ) : (
          <Zap size={90} strokeWidth={1.5} fill="currentColor" />
        )}
      </div>
      <span className="art-sticker">
        {cover === "space"
          ? "STAY CURIOUS"
          : cover === "nature"
            ? "GROW YOUR MIND"
            : cover === "world"
              ? "GO EXPLORE"
              : "LET’S PLAY"}
      </span>
    </div>
  );
}

export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <Sparkles className="hero-spark" size={37} />
      <span className="hero-doodle">✳</span>
      <div className="hero-card card-back" />
      <div className="hero-card card-front">
        <div className="hero-card-top">
          <span>QUESTION 01</span>
          <span>20s</span>
        </div>
        <div className="hero-atom">
          <Atom size={48} strokeWidth={1.5} />
        </div>
        <p>
          Ready for a little
          <br />
          brain power?
        </p>
        <div className="hero-answers">
          <span>▲</span>
          <span>◆</span>
          <span>●</span>
          <span>■</span>
        </div>
      </div>
      <div className="hero-burst">
        <Zap size={27} fill="currentColor" />
      </div>
      <span className="hero-caption">big curiosity. bigger smiles.</span>
    </div>
  );
}
