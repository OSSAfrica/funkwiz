# Contributing to Funkwiz

Bug reports, documentation improvements and pull requests are welcome. For a
large change, open an issue first so the scope can be discussed.

## Development

Use the Bun version pinned in `package.json` and follow the local setup in the
[README](README.md). Each installation has one teacher; use your own email and
keep `.dev.vars` private. Never commit accounts, student reports, browser sessions,
database copies or credentials.

Use the existing Tailwind tokens and shadcn/ui components. Support light/dark/system
appearance, keyboard access and reduced motion. Keep live-game state authoritative
on the server. Preserve existing browser-storage keys when changing branding.

## Checks

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run test:workers
bun run build
bun run check:client-secrets
bun run check:public
```

For UI/live-game changes, install Chromium once with
`bunx playwright install chromium`, then run `bun run test:e2e` or the relevant
specs. Browser tests reset **only** their disposable test databases on ports
3100/3101. The normal development account is separate. See
[the roadmap](docs/PLAN.md) for known browser-test timing issues.

Do not edit generated routes or runtime declarations by hand. Run
`bun run generate-routes` or `bun run cf-typegen` after changing the corresponding
inputs. Use fictional identities and mocked email services in tests.

Describe the behavior changed, why it helps, and the checks you ran in your pull
request. Keep unrelated formatting or generated files out of the change.
Contributions are made under the project's [MIT license](LICENSE).
