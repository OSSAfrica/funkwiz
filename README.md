# Funkwiz

Playful, self-hosted classroom quizzes. One teacher hosts; students join with a
code or QR scan, choose a nickname, and play without creating an account.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FOSSAfrica%2Ffunkwiz)

Deploy your own instance with Cloudflare Workers, D1 and Durable Objects. The
setup form asks for your app URL, teacher email and two independent secrets.
Google sign-in and email delivery are optional. Follow the
[deployment guide](docs/DEPLOY.md) for the first teacher account and custom domains.

![Funkwiz — A little curiosity. A lot of fun.](public/og/funkwiz-v1.png)

## Features

- Create four-choice quizzes or import and review structured JSON.
- Set one time limit for all questions or customize each question.
- Show questions on the shared screen, student devices, or both; change the mode
  between questions during a game.
- Choose teacher-led progression or automatic progression with a cooldown.
- Live rooms with reconnects, server-controlled timers, locked answers and leaderboards.
- Private teacher reports with PDF, CSV and JSON downloads.
- Email/password sign-in, private-code recovery, and optional Google sign-in.
- Optional password-reset email through Resend, Cloudflare Email, or SMTP.
- Light, dark and system appearance; keyboard access and reduced-motion support.
- Optional calming marimba music, gentle timer ticks and answer feedback.
- Branded social previews with private quiz and learner data excluded.

Each deployment supports **one teacher account** and separate student sessions.
It is not a hosted multi-tenant service. A local capacity check exercises 150
simultaneous students; production capacity depends on your Cloudflare account,
network and workload.

## Run locally

Use [Bun](https://bun.sh), pinned to `1.3.14` in `package.json`:

```sh
git clone https://github.com/OSSAfrica/funkwiz.git
cd funkwiz
bun install --frozen-lockfile
bun run setup:local you@example.com
bun run db:migrate:local
bun run dev
```

Open http://127.0.0.1:3000/login. Run `bun run setup:code` **in your own terminal**
to read your private setup code, then create your teacher account. Keep that code
in a password manager: it also enables password recovery.

Local secrets stay in the ignored `.dev.vars`; local data stays under
`.wrangler/`. Neither is copied to production. See [authentication](docs/AUTH.md)
for optional Google sign-in and email delivery.

## Use it

Create a quiz, add questions, and select **Host live**. Pick question visibility,
progression, timing and cooldown settings before opening the lobby. Students use
the join code or QR invitation. After the game, open the saved report to review
answers or download PDF, CSV or JSON.

See [live games](docs/LIVE_GAMES.md) and [an example question import](docs/quiz-import-example.json).
JSON imports accept up to 100 questions, exactly four answers per question, a
zero-based `correctIndex`, and a `duration` from 5 to 300 seconds.

## Development

React, TanStack Start, TypeScript, Tailwind CSS and shadcn/ui run on Cloudflare
Workers. D1 stores accounts, quizzes and reports; Durable Objects coordinate games.
Fonts, illustrations, social cards and the original soundtrack are bundled locally.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start local development on port 3000 |
| `bun run typecheck` | Generate routes and check TypeScript |
| `bun run test` | Run library tests |
| `bun run test:workers` | Run isolated Worker integration tests |
| `bun run test:e2e` | Run desktop/phone browser scenarios |
| `bun run build` | Build client and Worker bundles |
| `bun run preview` | Build and preview locally |
| `bun run deploy` | Build, apply production migrations, and deploy |
| `bun run deploy:worker` | Apply production migrations and deploy an existing build |
| `bun run check:public` | Check tracked files for local/private content |
| `bun run check:client-secrets` | Check built client assets against configured private values |
| `bun run email:dev` | Preview React Email templates on port 3002 |
| `bun run og:generate` | Regenerate social cards with Playwright Chromium |
| `bun run audio:generate` | Regenerate the soundtrack with ffmpeg |
| `bun run cf-typegen` | Regenerate Worker runtime/binding types |

Install Chromium with `bunx playwright install chromium` before browser tests or
card generation. Deployment commands modify the configured **remote** D1 database;
use the deployment guide before running them. Generated routes and runtime types
should not be edited manually. There is no linter configured.

- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)
- [Deploying to Cloudflare](docs/DEPLOY.md)
- [Deploying privately without publishing account details](docs/PRIVATE_DEPLOY.md)
- [Authentication and email templates](docs/AUTH.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Social previews](docs/SOCIAL_PREVIEWS.md)
- [Roadmap and known limitations](docs/PLAN.md)
- [Publishing checklist](docs/PUBLISHING.md)

## License

[MIT](LICENSE). Bundled font and icon notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
