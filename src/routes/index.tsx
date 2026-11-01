import { useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  FileJson,
  Monitor,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WorkspaceSidebar,
  WelcomeBanner,
} from "@/components/quiz/workspace-chrome";
import {
  WorkspaceDialog,
  type WorkspaceModal,
} from "@/components/quiz/workspace-dialog";
import { QuizCard } from "@/components/quiz/quiz-card";
import { sampleQuizzes } from "@/lib/sample-quizzes";
import { deleteQuiz, saveQuiz, useQuizLibrary } from "@/lib/quiz-store";
import { newQuiz } from "@/lib/quiz";

export const Route = createFileRoute("/")({ component: Home });

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function Home() {
  const { quizzes, error } = useQuizLibrary();
  const [modal, setModal] = useState<WorkspaceModal>(null);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const filtered = quizzes.filter(
    (q) =>
      (filter === "all" || (filter === "mine" ? !q.isExample : q.isExample)) &&
      `${q.title} ${q.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const mine = quizzes.filter((q) => !q.isExample).length;
  function openEditor() {
    setModal({ type: "editor", quiz: newQuiz() });
  }
  return (
    <div className="app-shell" inert={!hydrated}>
      <a className="skip-link" href="#main">
        Skip to quiz library
      </a>
      <WorkspaceSidebar
        count={quizzes.length}
        onCreate={openEditor}
        onImport={() => setModal({ type: "import" })}
        onGuide={() => setModal({ type: "guide" })}
        onLibrary={() => {
          setFilter("all");
          setSearch("");
          document
            .getElementById("library-heading")
            ?.scrollIntoView({ behavior: "instant" });
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={14} />
            <span>My library</span>
          </div>
          <button
            className="help-link"
            onClick={() => setModal({ type: "guide" })}
          >
            <CircleHelp size={17} />
            <span>Quick guide</span>
          </button>
        </header>
        <main id="main" className="workspace-main">
          <div className="page-heading reveal-in">
            <div>
              <div className="eyebrow">A GOOD DAY TO GET CURIOUS</div>
              <h1>
                Let’s make learning <span>play.</span>
                <svg viewBox="0 0 120 12" aria-hidden="true">
                  <path d="M3 8Q55 -2 117 6" />
                </svg>
              </h1>
              <p>A room full of minds. A quiz full of possibilities.</p>
            </div>
            <Button size="lg" onClick={openEditor}>
              <Plus size={19} />
              Create a quiz
            </Button>
          </div>
          <WelcomeBanner
            onPractice={() =>
              setModal({ type: "setup", quiz: quizzes[0] ?? sampleQuizzes[0] })
            }
          />
          <div className="quick-actions reveal-in">
            <button onClick={openEditor}>
              <span className="quick-icon bg-[#fce7dc]">
                <Plus size={21} />
              </span>
              <span>
                <strong>Start from a spark</strong>
                <small>Build a quiz, one question at a time</small>
              </span>
              <ArrowRight size={19} />
            </button>
            <button onClick={() => setModal({ type: "import" })}>
              <span className="quick-icon bg-[#e9e3fb]">
                <FileJson size={21} />
              </span>
              <span>
                <strong>Skip the copy-paste marathon</strong>
                <small>Import questions from your AI tool</small>
              </span>
              <ArrowRight size={19} />
            </button>
          </div>
          <section
            className="library-section reveal-in"
            aria-labelledby="library-heading"
          >
            <div className="library-heading">
              <div>
                <h2 id="library-heading">
                  Your quiz collection <span>{quizzes.length}</span>
                </h2>
                <p>A little something to get the neurons firing.</p>
              </div>
              <div className="search-field">
                <Search size={17} />
                <Input
                  aria-label="Search quizzes"
                  placeholder="Find a quiz…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="library-toolbar">
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="all">All quizzes</TabsTrigger>
                  <TabsTrigger value="mine">
                    My drafts <span className="tab-count">{mine}</span>
                  </TabsTrigger>
                  <TabsTrigger value="examples">Try an example</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="storage-label">
                <ShieldCheck size={14} />
                Saved in this browser
              </span>
            </div>
            {(error || notice) && (
              <div
                className={error ? "notice error-notice" : "notice"}
                role={error ? "alert" : "status"}
              >
                {error || (
                  <>
                    <Check size={16} />
                    {notice}
                  </>
                )}
              </div>
            )}
            <div className="quiz-grid">
              {filtered.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onAction={(type, quiz) => setModal({ type, quiz })}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="empty-state">
                <Search size={32} />
                <h3>
                  {search
                    ? "No quizzes in this corner of the universe."
                    : "Your next great quiz starts here."}
                </h3>
                <p>
                  {search
                    ? "Try another search or check a different tab."
                    : "Create your own or import a set of questions."}
                </p>
                <Button
                  variant="outline"
                  onClick={search ? () => setSearch("") : openEditor}
                >
                  {search ? "Clear search" : "Create a quiz"}
                </Button>
              </div>
            )}
          </section>
          <section className="bottom-note">
            <div className="flex items-center gap-3">
              <span className="bottom-note-icon">
                <Monitor size={20} />
              </span>
              <p>
                <strong>Your class. Your pace.</strong>
                <span>
                  One timer or many. Your screen or theirs. You’re in the
                  driver’s seat.
                </span>
              </p>
            </div>
            <button onClick={() => setModal({ type: "guide" })}>
              Meet your game controls
              <ArrowRight size={16} />
            </button>
          </section>
          <footer className="workspace-footer">
            <span>Made for curious minds & happy classrooms.</span>
            <span>
              <span className="tiny-dot" /> Local authoring preview
            </span>
          </footer>
        </main>
      </div>
      <WorkspaceDialog
        modal={modal}
        onChange={setModal}
        onSave={(quiz) => {
          saveQuiz(quiz);
          setModal(null);
          setFilter("mine");
          setNotice(`“${quiz.title}” saved in this browser.`);
        }}
        onDelete={(quiz) => {
          deleteQuiz(quiz.id);
          setModal(null);
          setNotice("Quiz removed from this browser.");
        }}
      />
    </div>
  );
}
