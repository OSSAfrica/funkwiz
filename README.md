# Funkwiz

**A little curiosity. A lot of fun.**

Funkwiz is an open-source app for running live, colorful quizzes with your class,
workshop or study group. Create questions, share a game code or QR invitation,
and let everyone answer from their own device. Students do not need accounts.

You host the app in your own Cloudflare account, choose your teacher email, and
keep control of your quizzes and reports. Funkwiz is available under the MIT license.

[Documentation & glossary](docs/README.md) · [Quick start](docs/GETTING_STARTED.md) ·
[Teacher guide](docs/TEACHER_GUIDE.md) · [Contribute](CONTRIBUTING.md)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FOSSAfrica%2Ffunkwiz)

![Funkwiz: A little curiosity. A lot of fun. Colorful quiz cards on a forest-green background.](public/og/funkwiz-v1.png)

## What can I use it for?

| Situation | Try this |
| --- | --- |
| A classroom warm-up | Ask a few questions to see what learners remember before a lesson. |
| Revision and exam practice | Review a topic, reveal answers together, and discuss common mistakes. |
| A training workshop | Check understanding after a short presentation or practical exercise. |
| Tutoring or a study group | Use longer question times and teacher-led progression to talk through answers. |
| A club or friendly trivia event | Invite participants by QR code and finish with a leaderboard. |

Participants can be children or adults. The interface uses the words *teacher*
and *student*, but the same host-and-player flow works for trainers and groups.

## How a game works

1. **Make a quiz.** Write four-choice questions or import a JSON question set and
   review it before saving. You can also start with the included examples.
2. **Choose your pace.** Give each question its own timer, decide where questions
   appear, and choose manual or automatic progression.
3. **Invite the room.** Open **Host live** and share the six-digit code, join link
   or QR code. Players enter a nickname and wait in the lobby.
4. **Play and discuss.** Start the quiz, pause when needed, and reveal answers.
   Correctness stays hidden until the reveal.
5. **Review the results.** Open the private teacher report and download PDF, CSV
   or JSON for later review.

A projector is optional: show questions on a shared screen, on student devices,
or on both. Players always have answer buttons on their devices.

## What is available today?

| Area | Included |
| --- | --- |
| Quiz authoring | Manual editing, examples, JSON imports, per-question or common time limits |
| Live games | QR/code joining, reconnects, locked answers, server-controlled timers and leaderboards |
| Host controls | Pause/resume, early reveal, manual/automatic progression and adjustable question visibility |
| Reports | Private results, workspace-scoped Admin visibility in School mode, themed PDF/CSV/JSON downloads |
| Teacher access | Email/password, private-code recovery, optional Google sign-in and reset emails |
| Appearance and sound | Light/dark/system themes, reduced-motion support, optional marimba music and sound effects |
| Self-hosting | Cloudflare deployment, separate private configuration and local development with Bun |

**Choose Personal or School mode.** Personal is the default single-teacher
experience. Opt-in [School mode](docs/WORKSPACES.md) adds invited teachers,
workspace switching and Owner/Admin/Teacher roles. Drafts stay private until
explicitly shared; workspace Admins can view reports in their workspace.
Students join games without accounts in either mode.

The implementation caps a room at 200 players; local testing exercises 150
simultaneous students. Pilot on your own deployment and network before using it
with a large class. See [current limits](docs/LIVE_GAMES.md#local-development-and-production).

## Choose your starting point

| I want to… | Start here |
| --- | --- |
| Join my teacher's game | [Student guide](docs/STUDENT_GUIDE.md) — no installation needed |
| Try Funkwiz on my computer | [Local quick start](#run-locally) |
| Deploy my own installation | [Deployment guide](docs/DEPLOY.md) |
| Deploy this public repository without publishing my account IDs | [Private deployment](docs/PRIVATE_DEPLOY.md) |
| Manage an invited teaching team | [School workspaces](docs/WORKSPACES.md) |
| Create and host my first quiz | [Teacher guide](docs/TEACHER_GUIDE.md) |
| Import my questions | [Import format and example](docs/QUIZ_IMPORTS.md) |
| Help build Funkwiz | [Contributing](CONTRIBUTING.md) and [development guide](docs/DEVELOPMENT.md) |

The Cloudflare button guides you through creating your own repository and cloud
resources. You supply your app URL, teacher email and two independent secrets.
Cloudflare account limits and charges apply. Google and email delivery are optional;
you can start with email/password sign-in and private-code recovery.

## Run locally

You need Git, **Bun 1.3.14** (pinned in `package.json`), and **Node.js 22.12 or
newer** for the installed Vite/Wrangler tooling. Development has been tested with
Node.js 24. Use Bun for the project commands:

```sh
git clone https://github.com/OSSAfrica/funkwiz.git
cd funkwiz
bun install --frozen-lockfile
bun run setup:local you@example.com
bun run db:migrate:local
bun run dev
```

Open http://127.0.0.1:3000/login. In your own terminal, run `bun run setup:code`,
then choose **Set up teacher account** and enter your configured email, a password
and that private setup code. Keep the code in a password manager; it also enables
password recovery. Never share it with players.

Local configuration lives in the ignored `.dev.vars`; local data lives under
`.wrangler/`. Neither is transferred to production. A phone cannot reach your
computer through a `127.0.0.1` invitation; use a reachable deployment for a real
classroom. [Getting started](docs/GETTING_STARTED.md) explains these paths.

## Built for contributors

Funkwiz uses React, TanStack Start, TypeScript, Tailwind CSS, shadcn/ui and Better
Auth on Cloudflare Workers. D1 stores accounts, quizzes and reports; Durable
Objects coordinate live rooms. Fonts, illustrations and the original soundtrack
are bundled locally.

```sh
bun run typecheck
bun run test
bun run test:workers
bun run build
bun run check:public
```

See [development](docs/DEVELOPMENT.md) for browser tests, all commands, generated
files and isolated test databases. The [architecture guide](docs/ARCHITECTURE.md)
shows where to make changes. Contributions to docs, accessibility, teaching
workflows and tests are welcome alongside code changes.

## Where the project is heading

Personal mode keeps individual setup simple; School mode provides the first
invite-only collaboration foundation for teams running their own installation.
Next possibilities include answer explanations, quiz organization, spreadsheet
imports and report-retention controls. Co-hosting, simultaneous editing,
self-paced assignments and public registration are not included today.

Read the [feature discussion](docs/FUTURE_FEATURES.md) and
[roadmap](docs/PLAN.md), or open a [GitHub issue](https://github.com/OSSAfrica/funkwiz/issues)
with your use case. A proposal is not a promised release date.

## Get help and contribute

Start with the [documentation index and glossary](docs/README.md) or
[troubleshooting](docs/TROUBLESHOOTING.md). For a bug, include reproduction steps,
your revision and fictional sample data in an issue. Follow
[SECURITY.md](SECURITY.md) for vulnerabilities; keep credentials and learner
reports out of public issues.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled asset notices.
Contributions use pull requests to `main`, with DCO sign-offs and verified commit
signatures. Follow our [Code of Conduct](CODE_OF_CONDUCT.md); the guide explains
signing setup, local checks and review requirements.

## License

Funkwiz is [MIT licensed](LICENSE). You can use, modify and redistribute it under
those terms. Bundled dependencies, fonts and icons retain their own licenses.
