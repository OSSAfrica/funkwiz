# Fun Quiz

A playful classroom quiz app built with React, TanStack Start, TypeScript,
Tailwind CSS, and shadcn/ui. It targets Cloudflare Workers through the Cloudflare
Vite plugin.

The agreed product behavior, architecture direction, and remaining work live in
[the implementation plan](docs/PLAN.md).

## Run locally

Use Bun 1.3.14 or newer:

```sh
bun install
bun run setup:local your-teacher-email@example.com
bun run db:migrate:local
bun run dev
```

Open http://127.0.0.1:3000. See [teacher account setup](docs/AUTH.md) for your private setup code and optional Google sign-in.

## What works now

- Responsive teacher library with search, example quizzes, and draft filters.
- Create/edit quizzes with four-choice questions and one correct answer.
- Apply a common time limit to all questions or customize individual durations.
- Import JSON by pasting or uploading; validate and review before saving.
- Teacher-only email/password sign-in and optional Google sign-in, hidden unless both Google credentials are configured.
- Account-backed quiz storage in D1, with JSON backups and explicit browser-draft migration.
- Account controls for adding/changing a password and signing out.
- Forgot-password recovery using the private setup code or an email link.
  Choose Resend, Cloudflare Email, or another SMTP service in your teacher account.
  Delivery enables when the selected service and sender are configured.
- Set display mode (shared screen, student devices, both), manual or automatic
  progression, and an automatic cooldown.
- Rehearse locally with host/student views, timers, answer reveal, pause/resume,
  progression switching, and next-question display changes.
- Colorful illustrations and brief feedback animations with reduced-motion support.

Live games now support student join codes, reconnecting, authoritative timers,
locked answers, leaderboards, and teacher-only saved reports. Sound and music are
optional. See [live game instructions](docs/LIVE_GAMES.md).

Development uses local D1 and Durable Objects. Production D1 and secrets still
need configuration before deployment. Google requires real OAuth credentials;
its button stays hidden until both are configured.

See [authentication setup](docs/AUTH.md) and [the database schema](docs/DATABASE_SCHEMA.md).

## Question imports

See [the example JSON](docs/quiz-import-example.json). Imports accept a quiz title,
an optional description, and up to 100 questions. Each question has:

- `prompt`: question text.
- `answers`: exactly four nonempty strings.
- `correctIndex`: zero-based correct answer (`0` through `3`).
- `duration`: a whole number of seconds from `5` to `300` (defaults to `20`).

Paste this format into your AI tool to request matching output, then review the
result in the editor. Imports are processed locally; built-in AI generation and
CSV imports are planned later.

## Commands

| Command                | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `bun run dev`          | Start development on port 3000                        |
| `bun run typecheck`    | Generate routes and check TypeScript                  |
| `bun test src/lib`     | Test validation, rehearsal, and live transitions      |
| `bun run test:workers` | Test room persistence, alarms, and scoring in Workers |
| `bun run test:e2e`     | Check desktop and phone flows with Playwright         |
| `bun run build`        | Build browser and Cloudflare Worker bundles           |
| `bun run preview`      | Build and preview the production app                  |
| `bun run cf-typegen`   | Regenerate types after changing Worker bindings       |
| `bun run deploy`       | Build and deploy to Cloudflare Workers                |

For browser tests, install Chromium once with `bunx playwright install chromium`.
There is no linter configured. Generated routes live in `src/routeTree.gen.ts`;
do not edit them by hand.

## UI components

shadcn/ui configuration lives in `components.json`; shared primitives are in
`src/components/ui`. Add components with `bunx --bun shadcn@latest add <component>`.
Quiz screens live in `src/components/quiz`; data validation, browser storage, and
rehearsal transitions live in `src/lib`.

Fonts are bundled locally through Fontsource. The illustrations use CSS and
Lucide icons, so the app does not depend on an external image service.

## Cloudflare

Authenticate with `bunx wrangler login` before deployment. D1 is bound locally, with a placeholder database ID that must be replaced before production deployment. Durable Objects are bound as `LIVE_ROOMS` and `LIVE_JOIN_LIMITER`, with a SQLite class migration. Object storage and AI bindings are not configured. After changing bindings in `wrangler.jsonc`, run `bun run cf-typegen`.

Keep local secrets in `.dev.vars` (ignored by Git), and set production secrets
with `bunx wrangler secret put SECRET_NAME`.

The Cloudflare build currently emits an upstream CSS source-map warning. It does
not prevent the production bundles from being generated.

## Scaffold history

Created with `npx wrangler init`, selecting TanStack Start / React / Cloudflare.
The starter demo was removed, and package management has been migrated to Bun.

The original creation log reported a failed TanStack Intent installation. To retry
the optional agent integration, use `bunx @tanstack/intent install`. It is separate
from building and running the application.

## Development React runtime

Vite resolves React and React DOM from the project root and prebundles their
runtime entries consistently. Its cache is isolated by mode under
`node_modules/.vite/<mode>` so normal development and parallel browser-test
servers cannot overwrite each other's optimized modules. After changing
runtime dependencies or restarting a previously broken dev session, reload any
open app tabs to discard modules cached by that tab.

### Emails, reports and appearance

- `bun run email:dev` previews React Email templates at `localhost:3002`.
  `bun run email:export` writes static HTML previews. See `docs/AUTH.md` for
  welcome, recovery and password-change delivery behavior.
- Open a saved game report and choose **Download report → PDF, CSV or JSON**.
  PDF uses the forest, gold and cream palette, embedded Nunito fonts and page
  numbers. CSV includes the leaderboard and question/answer breakdown, with
  spreadsheet formula protection. JSON preserves the original complete report.
  Exports stay on the teacher's device; PDF generation is loaded on demand.
- **Appearance** offers **Light**, **Dark** and **System**, saved on the current
  device and synchronized across tabs. System follows device changes. App dark
  mode does not change the printable PDF palette or email styling.

### Classroom audio

Live games include **Curious Garden**, an original 48-second marimba-style loop.
Use the music and sound buttons in the game header to enable them independently.
Open **Audio settings** for music/effects volume and optional gentle clock ticks.
Music lowers during questions and feedback. Audio rests while paused, offline,
or in a hidden tab; answer correctness is heard only after the server reveals it.

The soundtrack is fetched only after music is enabled. Listen directly at
`/audio/curious-garden.mp3`, or regenerate it with `bun run audio:generate`
(requires ffmpeg). See `public/audio/README.md` for the score and asset details.
