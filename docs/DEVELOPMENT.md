# Development and testing

[Documentation index](README.md) · [Contributing](../CONTRIBUTING.md) · [Architecture](ARCHITECTURE.md)

## Prerequisites

- Git and Bun **1.3.14**, matching `packageManager` and CI.
- Node.js **22.12 or newer** for the installed Vite/Wrangler tools; Node.js 24 has
  been used for development. Keep both tools available on your PATH.
- Chromium for browser tests and social-card generation.
- ffmpeg only if regenerating the soundtrack.

Use [local setup](GETTING_STARTED.md#try-it-on-your-computer). A local contributor
does not need production credentials, a Cloudflare login, Google OAuth or an
email provider for the ordinary app/test workflow. Network access is needed to
install dependencies and browser binaries.

## Commands

Run these from the repository root. `package.json` is the command source of truth.

| Command                                  | Purpose / target                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`          | Install the locked dependencies without updating resolution                  |
| `bun run setup:local you@example.com`    | Create local configuration only if absent                                    |
| `bun run setup:code`                     | Print the local private setup code in your own terminal                      |
| `bun run setup:code --production`        | Print the ignored private-production setup code; never put it in logs/issues |
| `bun run dev`                            | Development server on port 3000                                              |
| `bun run format`                         | Format supported project files with Oxfmt                                    |
| `bun run screenshots`                    | Capture the documented feature gallery with fictional local data             |
| `bun run format:check`                   | Check formatting without changing files; also runs in CI                     |
| `bun run generate-routes`                | Regenerate the file-route tree                                               |
| `bun run typecheck`                      | Generate routes and check TypeScript                                         |
| `bun run test`                           | Pure library and deployment-policy tests                                     |
| `bun run test:workers`                   | Isolated Worker/DO/auth-email integration tests                              |
| `bun run test:e2e`                       | Playwright desktop/phone, account and capacity scenarios                     |
| `bun run build`                          | Public-template build in `dist/`                                             |
| `bun run preview`                        | Build and preview locally                                                    |
| `bun run cf-typegen`                     | Generate types from the public Wrangler configuration                        |
| `bun run db:generate`                    | Generate a Drizzle migration after schema changes                            |
| `bun run db:migrate:local`               | Apply migrations to local D1 using the public source config                  |
| `bun run db:migrate:remote`              | Apply migrations to the **remote** database in the public source config      |
| `bun run deploy`                         | Public build, remote migrations and upload                                   |
| `bun run deploy:worker`                  | Validate and deploy the existing public build                                |
| `bun run build:private`                  | Build from ignored personal configuration into `.deploy/dist/`               |
| `bun run deploy:private:dry-run`         | Private build and local packaging checks; no remote migrations/upload        |
| `bun run deploy:private`                 | Private build, remote migrations and code/secrets upload                     |
| `bun run check:public`                   | Check tracked source for private/local content                               |
| `bun run check:client-secrets`           | Check public client output against configured private values                 |
| `bun run check:client-secrets --private` | Check private client output and production identifiers/values                |
| `bun run email:dev`                      | Preview React Email templates on port 3002                                   |
| `bun run email:export`                   | Export static email previews to ignored `.email-preview/`                    |
| `bun run og:generate`                    | Generate the three committed social cards                                    |
| `bun run audio:generate`                 | Generate the original MP3 soundtrack and a temporary WAV preview             |

`db:migrate:e2e`, `db:migrate:e2e-google` and `db:migrate:e2e-school` are fixture commands used by the browser
runner. Do not point those test configurations at a real installation. Deployment
commands are not part of the ordinary contribution checks.

## Choose the right checks

| Change                                | Useful verification                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Validation, game state or permissions | Library tests plus relevant Worker integration tests                                          |
| Routes, dialogs, forms or appearance  | Typecheck, build and affected desktop/phone browser specs                                     |
| Persistence, alarms or sockets        | Worker tests plus live/reconnect browser specs                                                |
| Email templates/delivery              | Worker email tests and local template preview; no real email required                         |
| Report export                         | Library export tests and report-download browser specs                                        |
| Deployment                            | Policy tests, typecheck, build/dry run, hygiene/client-value checks                           |
| Documentation                         | Check examples, relative links/anchors and current code behavior; avoid unnecessary app tests |

For browser tests, install the browser once:

```sh
bunx playwright install chromium
bun run test:e2e e2e/authoring.spec.ts --project desktop
bun run test:e2e e2e/social.spec.ts --project phone
bun run test:e2e --project school
```

The full suite is `bun run test:e2e`. Capacity and account projects have dependency
ordering in `playwright.config.ts`. `--no-deps` skips that ordering and should be
used deliberately; account scenarios can revoke fixture sessions. Known intermittent
timing failures are tracked in the [roadmap](PLAN.md).

## Test data and isolation

| Runtime                                | Data location / purpose                                                     |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Normal development                     | `.wrangler/state`; your local teacher account and quizzes                   |
| Desktop/phone browser fixture          | `.wrangler/e2e-state`, port 3100                                            |
| School fixture                         | `.wrangler/e2e-school-state`, port 3102; fictional invited teachers         |
| Google-provider fixture                | `.wrangler/e2e-google-state`, port 3101                                     |
| Worker integration suite               | Isolated local Worker test environments using `tests/worker/wrangler.jsonc` |
| Private production configuration/build | `.deploy/`; remote data lives in its configured Cloudflare resources        |

The browser runner resets its three test-state directories using
`scripts/prepare-e2e.ts`. It does not reset `.wrangler/state`. Test identities are
fictional, and email providers are mocked in integration tests. Do not replace
fixture configuration with production secrets.

## Feature screenshots

`bun run screenshots` refreshes the committed feature gallery using an isolated
School-mode browser fixture and fictional accounts/participants. See the
[screenshot tour](SHOWCASE.md#refresh-the-screenshots) for setup, privacy and capture
notes. Keep port 3102 free and run it separately from other browser tests.

## Generated files and assets

- `src/routeTree.gen.ts`: generated routes; do not edit manually.
- `worker-configuration.d.ts`: generated Worker/runtime declarations; use `cf-typegen`.
- `migrations/`: reviewed versioned changes. Never alter an already-applied SQL migration.
- `public/og/`: committed PNGs generated from local fonts and `scripts/social-card.ts`.
  Bump filenames when changing artwork and update metadata/tests accordingly.
- `public/audio/curious-garden.mp3`: generated from the original score. Preserve
  its [asset/license notes](../public/audio/README.md).
- `dist/`, `.deploy/`, email previews and browser artifacts: ignored output.

## Formatting

Oxfmt is the project formatter. The committed `.oxfmtrc.json` uses two spaces,
double quotes, semicolons and an 80-column print width. Import, Tailwind-class
and package-field sorting are disabled so formatting preserves their ordering.

```sh
bun run format
bun run format:check
```

CI runs both commands and then `git diff --exit-code`. If formatting changes a
tracked file, CI fails so the contributor can format and commit it locally.

Oxfmt respects `.gitignore`; the config also excludes generated route/runtime
declarations, the Bun lockfile, migration SQL/snapshots, private deployment files
and local agent settings. Regenerate those files with their owning tools.

VS Code and compatible editors recommend the official **Oxc** extension
(`oxc.oxc-vscode`). Install it to use the committed format-on-save settings for
supported project languages. CLI and CI use the locally installed Oxfmt version.

There is no linter configured. Keep edits focused and run the applicable checks.
Use existing shadcn/ui primitives and Tailwind tokens. Add a needed primitive with
`bunx --bun shadcn@latest add <component>` only after reviewing what it changes.

## Development runtime notes

Vite deduplicates React/React DOM and uses mode-specific caches under
`node_modules/.vite/<mode>`. This keeps ordinary development and browser-test
servers from replacing each other's React modules. Avoid editing source or
regenerating routes while browser checks are running; hot reload can interrupt them.
If runtime dependencies change, restart the dev server and reload open tabs.

Keep `.dev.vars`, `.deploy/`, databases and browser sessions out of commits. The
read-only GitHub Actions workflow checks formatting, types, library/Worker tests, builds,
tracked-file hygiene and Git history for secrets; it does not deploy.
