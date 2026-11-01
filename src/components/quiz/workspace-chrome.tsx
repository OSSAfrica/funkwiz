import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleHelp,
  FileJson,
  LayoutGrid,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroArt } from "./quiz-art";

type SidebarProps = {
  count: number;
  teacher: { name: string };
  onAccount: () => void;
  onCreate: () => void;
  onImport: () => void;
  onGuide: () => void;
  onLibrary: () => void;
};
export function WorkspaceSidebar({
  count,
  teacher,
  onAccount,
  onCreate,
  onImport,
  onGuide,
  onLibrary,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="Fun Quiz home">
        <span className="brand-mark">
          <Zap size={26} fill="currentColor" />
        </span>
        <span>
          fun<span className="brand-second">quiz</span>
          <span className="brand-dot">.</span>
        </span>
      </Link>
      <div className="workspace-label">YOUR TEACHER SPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <button
          className="nav-item active"
          aria-label="My library"
          aria-current="page"
          onClick={onLibrary}
        >
          <LayoutGrid size={19} />
          <span>My library</span>
          <span className="nav-count">{count}</span>
        </button>
        <button
          className="nav-item"
          aria-label="Import questions"
          onClick={onImport}
        >
          <FileJson size={19} />
          <span>Import questions</span>
        </button>
        <button className="nav-item" aria-label="How to play" onClick={onGuide}>
          <CircleHelp size={19} />
          <span>How to play</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="note-spark">✳</span>
          <h3>
            Small prep.
            <br />
            Big “aha!” moments.
          </h3>
          <p>Your next great class starts with a little curiosity.</p>
          <Button onClick={onCreate} variant="secondary">
            Make a quiz
            <Plus size={16} />
          </Button>
        </div>
        <button
          className="teacher-profile"
          onClick={onAccount}
          aria-label="Open teacher account"
        >
          <span className="teacher-avatar">
            {teacher.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{teacher.name}</strong>
            <span>Your private teacher space</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
export function WelcomeBanner({ onPractice }: { onPractice: () => void }) {
  return (
    <section
      className="welcome-banner reveal-in"
      aria-labelledby="banner-title"
    >
      <div className="banner-copy">
        <span className="banner-pill">
          <Sparkles size={13} />
          LESS LECTURE. MORE LET’S GO.
        </span>
        <h2 id="banner-title">
          Turn “is this on the test?”
          <br />
          into “one more round!”
        </h2>
        <p>
          Bring your questions. We’ll bring the fun.
          <br className="hidden sm:block" /> Create, customize, and find your
          classroom rhythm.
        </p>
        <Button variant="secondary" onClick={onPractice}>
          Try a practice round
          <ArrowRight size={17} />
        </Button>
      </div>
      <HeroArt />
    </section>
  );
}
