# Contributing to Funkwiz

[Documentation index](docs/README.md) · [Development](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md)

Thanks for helping make Funkwiz useful to teachers and learners. Documentation,
bug reports, accessibility reviews, teaching examples, tests and code improvements
are all welcome. You do not need production credentials or a live classroom to
make a useful contribution.

## Find a change

Start with the [roadmap](docs/PLAN.md), existing
[issues](https://github.com/OSSAfrica/funkwiz/issues), or a problem you can reproduce.
For a large change, open an issue describing the user, their problem and the
behavior you propose before building it. The [feature discussion](docs/FUTURE_FEATURES.md)
contains proposals; it does not mean every item is approved or assigned.

Small fixes to unclear wording, missing links, error messages or keyboard access
are good starting points. Avoid unrelated refactors in a bug-fix pull request.

## Report a bug or suggest a feature

For bugs, include the revision, runtime versions, local/deployed context, expected
behavior and minimal reproduction steps. Use fictional quiz and participant data.
Sanitize logs and screenshots: do not include credentials, private setup/reset
codes, teacher/student personal details, database copies or report exports.

For features, describe a concrete classroom or operator workflow and how people
handle it today. Explain whether it affects single-teacher use, a proposed school
workspace, or both. Mention tradeoffs and what can wait.

Report vulnerabilities through [SECURITY.md](SECURITY.md), not a public issue with
exploit details or sensitive data.

## Set up your checkout

1. Fork the repository on GitHub, then clone your fork.
2. Create a focused branch for your change.
3. Follow [local setup](docs/GETTING_STARTED.md#try-it-on-your-computer), using your
   own local email and generated secrets.
4. Read the relevant part of the [code map](docs/ARCHITECTURE.md#where-to-make-a-change).

Use Bun 1.3.14, the committed lockfile and a supported Node.js version. Local
configuration stays in `.dev.vars`; production settings stay in ignored `.deploy/`.
Use fictional accounts and workspaces rather than a real school’s data as shared
contributor fixtures. Personal mode is the default; see [School setup](docs/WORKSPACES.md).

## Implementation expectations

Use existing shadcn/ui primitives and Tailwind tokens. Support keyboard access,
light/dark/system appearance and reduced motion. Keep live-game state and scoring
authoritative on the server, and test authentication/ownership boundaries when
changing data access. See [architecture boundaries](docs/ARCHITECTURE.md#boundaries-to-preserve).

Preserve legacy browser-storage keys when changing branding. Do not edit generated
routes or runtime declarations manually; use `generate-routes` and `cf-typegen`.
Never change already-applied SQL migrations to alter the schema; add a reviewed
migration and document its data impact. Use fictional identities and mocked email
providers in tests.

Keep dependency additions justified and focused. The project is an application;
changes do not need a new package or service unless there is a concrete reason.

## Validate the change

The common checks are:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run test:workers
bun run build
bun run check:client-secrets
bun run check:public
```

Use the [change-to-checks guide](docs/DEVELOPMENT.md#choose-the-right-checks) to add
relevant browser or integration scenarios. Install Chromium once with
`bunx playwright install chromium` before browser tests. Test fixtures reset only
their designated databases on ports 3100/3101/3102; they do not replace your normal
local database. Do not run production deployment commands to validate a docs/UI fix.

For docs-only work, verify examples, relative links/anchors and the behavior being
described rather than rerunning unrelated application tests. State any checks you
could not complete; do not label the full browser suite green based on focused tests.

## Submit a pull request

Explain the problem, resulting behavior, scope and checks performed. Include a
screenshot for visible UI changes when useful, with fictional data. Call out
schema changes, configuration requirements and migration/compatibility concerns.

Keep a pull request focused and respond to review with small, clear changes.
Do not include `.dev.vars`, `.deploy/`, browser sessions, IDE state, generated test
artifacts or unrelated formatting. `git status`, `git diff --cached` and
`bun run check:public` help inspect what will be shared.

## Improve the documentation

Start from [docs/README.md](docs/README.md), the index and glossary. Update the
relevant guide rather than duplicating provider configuration in several places.
Add new guides to the index, explain new terms, and link back to the index from
each page. Keep current behavior separate from future proposals and use generic
origins/identifiers in examples. Personal deployment details never belong in docs.

Write for someone who has not read an issue or chat. Include prerequisites,
expected outcomes and the next useful link. A feature change should update its
user-facing guide and any affected operational/development notes.

## License

Contributions are made under the project's [MIT license](LICENSE). Preserve
upstream notices for reused assets and dependencies; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
