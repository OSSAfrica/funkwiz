import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Check, Clock3, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveBrand } from "@/components/live/live-common";
import { socialHead } from "@/lib/social";
import { DEFAULT_SCORING, scoringSummary } from "@/lib/live/scoring";

export const Route = createFileRoute("/help")({
  head: ({ match }) => socialHead("help", match.context.siteOrigin),
  component: Help,
});

const sections = [
  {
    id: "scoring",
    title: "Scoring & rankings",
    questions: [
      [
        "What decides who wins?",
        "The most correct answers wins. Among players with the same number correct, higher time-based points wins. If points also tie, we compare more precise response timing relative to each question’s duration. Identical results share a rank. Joining earlier does not win a tie.",
      ],
      [
        "How are points calculated?",
        "A correct answer earns 700 points plus a speed bonus of up to 300. Points = 700 + round(300 × remaining time ÷ question duration). On a 20-second question, answering after 2 seconds earns 970, after 5 seconds 925, and after 10 seconds 850. Wrong or unanswered questions earn 0. Points appear when the answer is revealed.",
      ],
      [
        "Can someone with fewer points finish higher?",
        "Yes. Eight correct answers earning 5,600 points rank above seven correct answers earning 7,000 points. Accuracy comes first. Points separate players with equal accuracy.",
      ],
      [
        "What happens with different timers, pauses or answer changes?",
        "Speed uses the proportion of the question timer you used, so 5 seconds on a 20-second question and 10 seconds on a 40-second question earn the same points. Paused time is excluded. When changes are allowed, only your final choice and its submission time count. Repeating your saved choice does not restart its timing.",
      ],
      [
        "Does my connection affect timing?",
        "The server records when your answer arrives. Network delays can affect the speed bonus, but cannot let fewer correct answers beat more correct answers. Stay connected and wait for the saved-answer confirmation. The app does not trust a timestamp supplied by a player’s device.",
      ],
      [
        "Why does an older game show different rules?",
        "Games keep the scoring rules they started with. Earlier games may use flat points or 1,000 / 900 / 800 / 700 correct-answer tiers. Saved reports and downloads retain those original rules. Check the scoring note for that game.",
      ],
    ],
  },
  {
    id: "playing",
    title: "Joining & playing",
    questions: [
      [
        "Do students need accounts?",
        "No. Open your teacher’s app address, enter the six-digit game code and choose a unique nickname, or scan the lobby QR code. Join before the game starts. Teachers sign in to create and host quizzes.",
      ],
      [
        "Can I change an answer?",
        "Answers lock by default. The teacher can allow changes for the quiz and change the setting between questions. When enabled, choose another answer before time ends or the teacher reveals it. Answering and changes are disabled while paused.",
      ],
      [
        "Where will I see the question?",
        "The teacher chooses the shared screen, student devices or both. If you only see answer buttons, read the shared screen. The teacher can change this between questions; the next question uses the updated setting.",
      ],
      [
        "What if I refresh or disconnect?",
        "Return to the same game in the same browser to restore your nickname and saved answers using its private room cookie. A different browser, cleared cookies or a different device cannot restore that identity. Automatic timers continue while a host reconnects.",
      ],
      [
        "How do sound and appearance work?",
        "Choose Light, Dark or System appearance. Music and sound effects have separate controls. Browsers may require you to enable audio once. Muting sound does not affect answering or scoring, and your preferences stay on that browser.",
      ],
    ],
  },
  {
    id: "hosting",
    title: "Creating & hosting",
    questions: [
      [
        "How long should a quiz be?",
        "We recommend 7–10 questions and keeping most classroom quizzes under 20 questions. The editor supports 1–100 questions. Each question can have its own 5–300 second timer, or you can apply one duration to all questions.",
      ],
      [
        "What is manual versus automatic progression?",
        "Manual reveals the answer when time ends and waits for the teacher to move on. Automatic reveals the answer, waits for the configured 1–60 second cooldown, then advances. Manual mode has no automatic cooldown. The host can pause, reveal early or end the game.",
      ],
      [
        "Can AI help me create a quiz?",
        "Yes. The import dialog provides a JSON example and a prompt to use with an AI tool and your topic or document. Paste or upload the generated JSON, review every question and correct answer, then save. The app does not automatically read documents or call an AI service.",
      ],
      [
        "What is the difference between practice and a live game?",
        "Practice lets a teacher rehearse locally with presenter and student views. It does not accept live participants or create a saved live-game report. Open a live lobby to play with your class.",
      ],
    ],
  },
  {
    id: "reports",
    title: "Results & reports",
    questions: [
      [
        "What does each question’s percentage mean?",
        "It is correct answers divided by submitted answers, rounded to a whole percentage. One correct answer out of two responses is 50%, even if another player did not answer. No answers means there were no responses; Not asked means the game never reached that question.",
      ],
      [
        "What can I download or share?",
        "Teachers can download reports as a branded PDF, spreadsheet CSV or structured JSON. Filenames combine the quiz title, room code and finish time in UTC, using hyphens. Students can download an image of their own result, including rank, participant count, points and correct-answer count.",
      ],
      [
        "Who can see a report?",
        "The host can see their reports. In School mode, workspace Owners and Admins can review all reports in that workspace. Other teachers do not automatically gain access. Reports can contain nicknames and results, so share downloads with appropriate recipients.",
      ],
    ],
  },
  {
    id: "installations",
    title: "Personal, School & offline",
    questions: [
      [
        "What is Personal mode?",
        "Personal mode is an installation for one teacher. The configured teacher email and private setup code protect initial registration. Daily sign-in uses the teacher’s password or Google when configured. Students only need the game code, not the teacher’s private setup code.",
      ],
      [
        "What changes in School mode?",
        "A School installation supports invited teachers, multiple workspaces and Owner, Admin and Teacher roles. Quiz drafts stay private until explicitly shared. Shared quizzes can be copied into another teacher’s drafts. Teacher access is invitation-based after the initial owner setup.",
      ],
      [
        "Can we play without internet?",
        "Prepared offline Personal classrooms run on the teacher’s computer. Everyone joins the same local Wi-Fi or hotspot and uses the displayed local link or lobby QR code. Keep the teacher’s computer awake. Preparation needs internet initially; School mode is not supported for offline classroom hosting.",
      ],
      [
        "What if I forget my teacher password?",
        "Choose Forgot password on the sign-in page. Use the supported private setup-code recovery, or email recovery when an administrator has configured delivery. Google sign-in appears only when its credentials are available. Email providers and recovery setup are explained in the GitHub authentication guide.",
      ],
      [
        "Where are the setup and contribution guides?",
        "The public GitHub documentation covers Personal and School setup, offline preparation, authentication, backups and contributing. Each self-hosted installation keeps its own accounts and data. This help page is available without signing in and works in a prepared offline classroom.",
      ],
    ],
  },
];

function Help() {
  return (
    <main className="help-page">
      <a className="skip-link" href="#help-content">
        Skip to help
      </a>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/join" search={{}} aria-label="Funkwiz join">
          <LiveBrand />
        </Link>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/">Teacher library</Link>
          </Button>
          <Button asChild>
            <Link to="/join" search={{}}>
              Join a game
            </Link>
          </Button>
        </div>
      </header>
      <section className="help-hero" aria-labelledby="help-title">
        <span className="eyebrow">
          <Sparkles size={16} aria-hidden="true" /> A LITTLE HELP. MORE “AHA!”
        </span>
        <h1 id="help-title">
          Good questions.
          <br />
          <span>Clear answers.</span>
        </h1>
        <p>
          Your guide to playing, hosting, scoring and making the most of
          Funkwiz.
        </p>
        <nav aria-label="Help topics" className="flex flex-wrap gap-3 mt-6">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="help-topic">
              {section.title}
            </a>
          ))}
        </nav>
      </section>
      <div id="help-content">
        <section className="help-scoring-card" aria-labelledby="ranking-title">
          <Trophy size={30} aria-hidden="true" />
          <div>
            <span className="eyebrow">THINK FIRST. THEN TAP.</span>
            <h2 id="ranking-title">Accuracy wins. Speed breaks ties.</h2>
            <p>{scoringSummary(DEFAULT_SCORING)}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <span>
                <Check size={16} /> Most correct answers first
              </span>
              <span>
                <Clock3 size={16} /> Time-based points next
              </span>
            </div>
          </div>
        </section>
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="help-section"
            aria-labelledby={`${section.id}-title`}
          >
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            {section.questions.map(([question, answer]) => (
              <details key={question} className="help-question">
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>
        ))}
      </div>
      <footer className="help-footer">
        <BookOpen size={20} aria-hidden="true" />
        <div>
          <strong>Keep exploring.</strong>
          <p>
            <a
              href="https://github.com/OSSAfrica/funkwiz/blob/main/docs/README.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub documentation (opens in a new tab)
            </a>{" "}
            ·{" "}
            <Link to="/login" search={{}}>
              Teacher sign-in
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
