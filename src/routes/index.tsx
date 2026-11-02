import { socialHead } from "@/lib/social";
import { useState, useSyncExternalStore } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  FileJson,
  FolderInput,
  UserRound,
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
import { readBrowserDrafts, useQuizLibrary } from "@/lib/quiz-store";
import { AccountDialog } from "@/components/auth/account-dialog";
import { getEmailDeliverySettings } from "@/lib/email.functions";
import { getTeacher, getPasswordStatus } from "@/lib/auth.functions";
import { listQuizzes } from "@/lib/quizzes.functions";
import { RecentGames } from "@/components/live/recent-games";
import { listLiveSessions } from "@/lib/live/reports.functions";
import { openLiveRoom } from "@/lib/live/client";
import { getWorkspaceState } from "@/lib/workspaces.functions";
import {
  SchoolWelcome,
  WorkspaceControls,
} from "@/components/workspaces/workspace-controls";
import { canManageMembers } from "@/lib/workspace-policy";
import { newQuiz } from "@/lib/quiz";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const teacher = await getTeacher();
    if (!teacher) throw redirect({ to: "/login", search: {} });
    return { teacher };
  },
  loader: async () => {
    const [quizzes, password, sessions, emailSettings, workspace] =
      await Promise.all([
        listQuizzes(),
        getPasswordStatus(),
        listLiveSessions(),
        getEmailDeliverySettings(),
        getWorkspaceState(),
      ]);
    return {
      quizzes,
      hasPassword: password.hasPassword,
      sessions,
      emailSettings,
      workspace,
    };
  },
  head: ({ match }) => socialHead("app", match.context.siteOrigin),
  component: Home,
});

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function Home() {
  const initial = Route.useLoaderData();
  const { teacher } = Route.useRouteContext();
  if (initial.workspace.school && !initial.workspace.active)
    return <SchoolWelcome state={initial.workspace} name={teacher.name} />;
  return (
    <Library
      key={`${initial.workspace.active?.id ?? "personal"}:${initial.workspace.active?.role ?? "teacher"}:${initial.quizzes.map((quiz) => quiz.id).join(",")}`}
    />
  );
}
function Library() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const [hosting, setHosting] = useState(false);
  const { teacher } = Route.useRouteContext();
  const { quizzes, error, busy, save, remove, migrate, share, copy } =
    useQuizLibrary(initial.quizzes);
  const [accountOpen, setAccountOpen] = useState(false);
  const [migrationError, setMigrationError] = useState("");
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
      (filter === "all" ||
        (filter === "mine"
          ? !q.isExample && q.canEdit !== false
          : filter === "shared"
            ? q.visibility === "workspace"
            : q.isExample)) &&
      `${q.title} ${q.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const mine = quizzes.filter(
    (q) => !q.isExample && q.canEdit !== false,
  ).length;
  function openEditor() {
    setModal({ type: "editor", quiz: newQuiz() });
  }
  function openBrowserDrafts() {
    const legacy = readBrowserDrafts();
    setMigrationError(legacy.error);
    setModal({
      type: "migrate",
      drafts: legacy.drafts.filter(
        (draft) =>
          !quizzes.some((quiz) => quiz.id === draft.id && !quiz.isExample),
      ),
    });
  }
  return (
    <div
      className={
        initial.workspace.school ? "app-shell school-shell" : "app-shell"
      }
      inert={!hydrated}
    >
      <a className="skip-link" href="#main">
        Skip to quiz library
      </a>
      <WorkspaceSidebar
        count={quizzes.length}
        teacher={teacher}
        workspaceName={initial.workspace.active?.name}
        onAccount={() => setAccountOpen(true)}
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
        <header
          className={
            initial.workspace.school ? "topbar school-topbar" : "topbar"
          }
        >
          {initial.workspace.school ? (
            <WorkspaceControls state={initial.workspace} />
          ) : (
            <div className="breadcrumb">
              Workspace
              <ChevronRight size={14} />
              <span>My library</span>
            </div>
          )}
          <div className="workspace-header-actions">
            <button
              className="help-link"
              onClick={openBrowserDrafts}
              aria-label="Browser drafts"
            >
              <FolderInput size={17} />
              <span>Browser drafts</span>
            </button>{" "}
            <button
              className="help-link"
              onClick={() => setModal({ type: "guide" })}
            >
              <CircleHelp size={17} />
              <span>Quick guide</span>
            </button>
            <button
              className="help-link"
              aria-label="Teacher account"
              onClick={() => setAccountOpen(true)}
            >
              <UserRound size={17} />
            </button>
          </div>
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
            onPractice={() => setModal({ type: "setup", quiz: quizzes[0] })}
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
                  {initial.workspace.school && (
                    <TabsTrigger value="shared">Shared library</TabsTrigger>
                  )}
                  <TabsTrigger value="examples">Try an example</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="storage-label">
                <ShieldCheck size={14} />
                {initial.workspace.school
                  ? "Private drafts · Share when ready"
                  : "Saved to your account"}
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
                  school={initial.workspace.school}
                  busy={busy}
                  onAction={async (type, quiz) => {
                    if (type === "share") {
                      try {
                        await share(quiz);
                        setNotice(
                          quiz.visibility === "workspace"
                            ? "Quiz is private again. Existing copies and game snapshots are unchanged."
                            : "Quiz shared with this workspace. Colleagues can copy it into their own drafts.",
                        );
                      } catch {
                        /* Sharing errors stay visible. */
                      }
                    } else if (type === "copy") {
                      try {
                        const copied = await copy(quiz);
                        setModal({ type: "editor", quiz: copied });
                        setFilter("mine");
                      } catch {
                        /* Copy errors stay visible. */
                      }
                    } else setModal({ type, quiz });
                  }}
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
          <RecentGames
            sessions={initial.sessions}
            workspaceReports={
              initial.workspace.school &&
              canManageMembers(initial.workspace.active?.role)
            }
          />
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
              <span className="tiny-dot" /> Teacher workspace · Live & playful
            </span>
          </footer>
        </main>
      </div>
      <WorkspaceDialog
        modal={modal}
        onChange={setModal}
        busy={busy || hosting}
        error={modal?.type === "migrate" ? error || migrationError : error}
        onSave={async (quiz) => {
          await save(quiz);
          setModal(null);
          setFilter("mine");
          setNotice(`“${quiz.title}” saved to your account.`);
        }}
        onDelete={async (quiz) => {
          try {
            await remove(quiz.id);
            setModal(null);
            setNotice("Quiz removed from your account.");
          } catch {
            /* Error remains visible in the dialog. */
          }
        }}
        onHost={async (quiz, settings) => {
          setHosting(true);
          try {
            const room = await openLiveRoom(quiz.id, settings);
            await navigate({ to: "/host/$code", params: { code: room.code } });
          } finally {
            setHosting(false);
          }
        }}
        onCopy={async (drafts) => {
          try {
            const imported = await migrate(drafts);
            setModal(null);
            setFilter("mine");
            setNotice(
              `${imported} browser ${imported === 1 ? "draft" : "drafts"} copied to your account. Originals were kept.`,
            );
          } catch {
            /* Originals remain untouched and the dialog shows the error. */
          }
        }}
      />
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        teacher={teacher}
        hasPassword={initial.hasPassword}
        emailSettings={initial.emailSettings}
      />
    </div>
  );
}
