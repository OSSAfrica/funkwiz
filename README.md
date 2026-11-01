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
bun run dev
```

Open http://localhost:3000.

## What works now

- Responsive teacher library with search, example quizzes, and draft filters.
- Create/edit quizzes with four-choice questions and one correct answer.
- Apply a common time limit to all questions or customize individual durations.
- Import JSON by pasting or uploading; validate and review before saving.
- Save drafts in this browser; export JSON backups and import them elsewhere.
- Set display mode (shared screen, student devices, both), manual or automatic
  progression, and an automatic cooldown.
- Rehearse locally with host/student views, timers, answer reveal, pause/resume,
  progression switching, and next-question display changes.
- Colorful illustrations and brief feedback animations with reduced-motion support.

This is a **local authoring preview**. There are no connected students, teacher
accounts, live join codes, or server-side quiz storage yet. Clearing browser data
removes saved quizzes; export important drafts. Support for 100+ players will be
verified when the multiplayer backend is implemented.

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

| Command              | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `bun run dev`        | Start development on port 3000                   |
| `bun run typecheck`  | Generate routes and check TypeScript             |
| `bun test src/lib`   | Test import validation and rehearsal transitions |
| `bun run test:e2e`   | Check desktop and phone flows with Playwright    |
| `bun run build`      | Build browser and Cloudflare Worker bundles      |
| `bun run preview`    | Build and preview the production app             |
| `bun run cf-typegen` | Regenerate types after changing Worker bindings  |
| `bun run deploy`     | Build and deploy to Cloudflare Workers           |

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

Authenticate with `bunx wrangler login` before deployment. No D1, Durable Object,
object storage, or AI bindings are configured yet. Add bindings to
`wrangler.jsonc`, then run `bun run cf-typegen`.

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
