# Contributing to Funkwiz

[Documentation index](docs/README.md) · [Development](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md)

Contributions go through pull requests targeting `main`. Sign off and
cryptographically sign each contribution commit, run the checks relevant to your
change, and explain the resulting behavior and validation.

[Commit requirements](#commit-requirements) · [Local checks](#validate-the-change) ·
[Merge requirements](#review-and-merge-requirements) · [Troubleshooting](#when-a-pull-request-is-blocked)

Thanks for helping make Funkwiz useful to teachers and learners. Documentation,
bug reports, accessibility reviews, teaching examples, tests and code improvements
are all welcome. You do not need production credentials or a live classroom to
make a useful contribution.

## Discuss the change

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Search existing issues before
opening a new one; use the bug/feature templates to provide the relevant context.

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
handle it today. Explain whether it affects single-teacher use, a School
workspace, or both. Mention tradeoffs and what can wait.

Report vulnerabilities through [SECURITY.md](SECURITY.md), not a public issue with
exploit details or sensitive data.

## Set up your checkout

Fork the repository, then replace `YOUR_USERNAME` and the example branch name:

```sh
git clone https://github.com/YOUR_USERNAME/funkwiz.git
cd funkwiz
git remote add upstream https://github.com/OSSAfrica/funkwiz.git
git fetch upstream
git switch -c fix/describe-your-change upstream/main
```

Follow [local setup](docs/GETTING_STARTED.md#try-it-on-your-computer), using your own
local email and generated secrets. Read the relevant part of the
[code map](docs/ARCHITECTURE.md#where-to-make-a-change).

Use Bun 1.3.14, the committed lockfile and a supported Node.js version. Local
configuration stays in `.dev.vars`; production settings stay in ignored `.deploy/`.
Use fictional accounts and workspaces rather than a real school’s data as shared
contributor fixtures. Personal mode is the default; see [School setup](docs/WORKSPACES.md).

## Commit requirements

### DCO sign-off and signature are separate

| Requirement                              | Git option                                                                | How to verify                                               |
| ---------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Developer Certificate of Origin sign-off | Lowercase `-s` / `--signoff` adds a `Signed-off-by: Name <email>` trailer | Inspect each commit message and the PR's `DCO` check        |
| Cryptographic signature                  | Uppercase `-S` / `--gpg-sign` signs using your configured key             | Inspect signatures locally and GitHub's **Verified** status |

Use both for every contribution commit, including follow-up fixes:

```sh
git add path/to/changed-file
git commit -S -s -m "fix(quiz): describe the behavior being corrected"
```

Signing does not add a DCO trailer; signing off does not add a signature. Neither
operation changes earlier commits.

### DCO and author identity

Read the [Developer Certificate of Origin](https://developercertificate.org/).
Signing off certifies your right to submit the contribution under its applicable
open source license. The trailer becomes part of the public history.

Configure your own identity for this checkout:

```sh
git config --local user.name "Your Name"
git config --local user.email "you@example.com"
```

For your own commits, the sign-off must match the commit author's identity. Use a
GitHub-associated email; a correctly configured GitHub noreply address can help
preserve email privacy. Preserve other contributors' authorship and sign-offs.
Never invent a sign-off for someone else.

The organization installs the [DCO app](https://github.com/dcoapp/app) for all
repositories. No tracked DCO configuration enables individual/third-party
remediation commits. A trailer in a PR description or an unrelated later commit
does not repair missing trailers in earlier commits.

### Verified signing

The `main` ruleset requires verified signatures. GitHub supports GPG, SSH and
S/MIME signing. Configure your preferred method using
[GitHub's signing guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits).
For GPG, upload your **public** signing key to GitHub and use a matching verified
committer email. Then replace `YOUR_GPG_KEY_ID`:

```sh
git config --local gpg.format openpgp
git config --local user.signingkey YOUR_GPG_KEY_ID
git config --local commit.gpgsign true
```

Retain your existing configuration if you already use verified SSH or S/MIME
signing. Signing by default still does not add DCO trailers.

Before pushing, inspect all contribution commits:

```sh
git log --show-signature upstream/main..HEAD
git log --format='%h %an <%ae>%n%B' upstream/main..HEAD
```

After pushing, check the PR's **Commits** tab and `DCO` result. A locally valid
signature alone does not establish that GitHub recognizes the signing identity.

### Commit messages

Use Conventional Commits, such as `feat(workspaces): …`, `fix(timer): …` or
`docs: …`. Common types also include `test`, `refactor`, `chore` and `ci`.
Explain non-obvious tradeoffs in the body and keep unrelated changes separate.

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
bun run format:check
bun run typecheck
bun run test
bun run test:workers
bun run build
bun run check:client-secrets
bun run check:public
git diff --check
```

Use the [change-to-checks guide](docs/DEVELOPMENT.md#choose-the-right-checks) to add
relevant browser or integration scenarios. Install Chromium once with
`bunx playwright install chromium` before browser tests. Test fixtures reset only
their designated databases on ports 3100/3101/3102; they do not replace your normal
local database. Do not run production deployment commands to validate a docs/UI fix.

For docs-only work, verify examples, relative links/anchors and the behavior being
described rather than rerunning unrelated application tests. State any checks you
could not complete; do not label the full browser suite green based on focused tests.

Use `bun run format` to apply Oxfmt formatting before submitting. Formatting is
checked in CI. See [formatting and editor setup](docs/DEVELOPMENT.md#formatting)
for the configuration and excluded generated files.

## Submit a pull request

Push your branch to your fork and open a PR against `OSSAfrica/funkwiz:main`:

```sh
git push -u origin HEAD
```

Use the PR template to explain the problem, resulting behavior, scope and checks performed. Include a
screenshot for visible UI changes when useful, with fictional data. Call out
schema changes, configuration requirements and migration/compatibility concerns.

Keep a pull request focused and respond to review with small, clear changes.
Do not include `.dev.vars`, `.deploy/`, browser sessions, IDE state, generated test
artifacts or unrelated formatting. `git status`, `git diff --cached` and
`bun run check:public` help inspect what will be shared.

If `main` advances, update your branch and rerun applicable checks. A signed merge
preserves existing history:

```sh
git fetch upstream
git merge -S --signoff upstream/main
git push origin HEAD
```

Resolve conflicts and review the result before pushing. Rebasing is also allowed,
but recreated commits need valid sign-offs and fresh signatures.

## Review and merge requirements

The setup is recorded in [contribution requirements](docs/CONTRIBUTION_REQUIREMENTS.md).
Check the [live rules](https://github.com/OSSAfrica/funkwiz/rules) and the PR merge
box if the settings change.

| Requirement             | Before merge                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull request and review | Target `main` and obtain at least one qualifying approval. Authors cannot approve their own PR. New commits dismiss previous approvals.                          |
| Unattributed Copilot PR | The ruleset requires one additional approval for an unattributed Copilot PR.                                                                                     |
| Verified signatures     | Contribution commits must satisfy GitHub's signature requirement.                                                                                                |
| DCO                     | Each contribution commit must have a matching sign-off and the `DCO` check must pass. This is contribution policy; `DCO` is not a named required status context. |
| Required CI             | `check` and `secrets` from GitHub Actions must pass on an up-to-date branch. The `check` job includes tests, typecheck and build validation.                     |
| CodeQL                  | Required analyses must exist. High/critical security findings and error/warning alerts block merging.                                                            |
| Code Quality            | The required analysis must have no unresolved findings at the error threshold. A completed workflow alone does not prove the finding gates pass.                 |
| Other security checks   | Review applicable GitGuardian, Kusari and Socket findings. They are not all named required status contexts.                                                      |
| Review feedback         | Resolve requested changes and explain open questions. Automated comments or AI reviews do not replace a qualifying reviewer approval.                            |

`main` blocks force pushes and deletion. Merge, squash and rebase are permitted;
maintainers choose a method that preserves signatures, attribution, sign-offs and
passing checks. Administrative bypass is not the normal contribution path.

### Before requesting review

- [ ] Explain the problem and resulting behavior; link the related issue when applicable.
- [ ] Check all contribution commits for matching sign-offs and verified signatures.
- [ ] Run relevant checks, add appropriate tests and update affected guides/examples.
- [ ] Call out migrations, configuration and Personal/School compatibility changes.
- [ ] Remove private configuration, credentials and real participant data.
- [ ] Bring the branch up to date and address CI/security/reviewer findings.

## When a pull request is blocked

**DCO failure:** inspect the failing commit IDs in the check details. For your own
latest commit that you have not pushed, add the sign-off and signature with:

```sh
git commit --amend --no-edit -S -s
```

For published commits, coordinate with maintainers before rewriting shared history.
A replacement branch can preserve the original branch:

```sh
git fetch upstream
git switch -c fix/signed-contribution upstream/main
git cherry-pick -S -s YOUR_COMMIT_SHA
git push -u origin HEAD
```

Use your own ordinary commits, oldest first; retest and link the replacement PR.
Ask a maintainer for help with mixed authorship or merge commits.

**Unsigned or unverified commit:** check the signing format, public key and
committer email. Recreated commits need fresh signatures; verify every commit
again on GitHub after changing history.

**Checks waiting for permission:** fork workflow approval allows CI to run; it is
separate from approval to merge. Ask a maintainer to inspect the pending run.
Do not weaken the checks or expose secrets to fork workflows.

**Missing analysis or failed CI:** open the failing job or finding. Missing
results are not a pass. Share the failing step and sanitized logs. To monitor a PR:

```sh
gh pr checks PR_NUMBER --repo OSSAfrica/funkwiz --watch
```

## Releases and deployments

Funkwiz is a self-hosted application. The current workflows validate contributions
and analyze code; they do not automatically publish a release or deploy on merge.
Deployment is an operator action documented in [deployment](docs/DEPLOY.md) and
[private deployment](docs/PRIVATE_DEPLOY.md). Do not create release tags or change a
production installation as part of ordinary contribution validation.

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
