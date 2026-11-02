# Funkwiz documentation

[Project overview](../README.md) · [Contributing](../CONTRIBUTING.md) · [Security](../SECURITY.md)

Funkwiz is a self-hosted live quiz app. This index helps you choose a guide without
needing to know how the app is built. The [glossary](#glossary) explains terms used
throughout the documentation.

**Current scope:** Personal mode for one teacher, or opt-in [School mode](WORKSPACES.md)
with invited teachers, workspaces and scoped roles. Students join without accounts
in both. Further collaboration/learning ideas remain [proposals](FUTURE_FEATURES.md).

## Start with your goal

| Your goal                             | Read this first                                               | Then                                                           |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Understand what Funkwiz does          | [Project README](../README.md)                                | [Getting started](GETTING_STARTED.md)                          |
| Join a game                           | [Student guide](STUDENT_GUIDE.md)                             | Ask your teacher for the app link and game code                |
| Write and run a quiz                  | [Teacher guide](TEACHER_GUIDE.md)                             | [Live game rules](LIVE_GAMES.md)                               |
| Bring an existing question set        | [Question imports](QUIZ_IMPORTS.md)                           | [Example JSON](quiz-import-example.json)                       |
| Try it locally                        | [Getting started](GETTING_STARTED.md#try-it-on-your-computer) | [Troubleshooting](TROUBLESHOOTING.md)                          |
| Deploy a new copy                     | [Cloudflare deployment](DEPLOY.md)                            | [Authentication setup](AUTH.md)                                |
| Keep my production details out of Git | [Private deployment](PRIVATE_DEPLOY.md)                       | [Operations](OPERATIONS.md)                                    |
| Manage teachers and workspace access  | [School mode](WORKSPACES.md)                                  | [Authentication](AUTH.md)                                      |
| Maintain an installation              | [Operations](OPERATIONS.md)                                   | [Security policy](../SECURITY.md)                              |
| Contribute a change                   | [Contributing](../CONTRIBUTING.md)                            | [Development](DEVELOPMENT.md), [architecture](ARCHITECTURE.md) |
| Discuss the next features             | [Feature proposals](FUTURE_FEATURES.md)                       | [Roadmap](PLAN.md)                                             |

## Guides and reference

### Teachers and students

- [Screenshot tour](SHOWCASE.md): real app screens and a downloadable student result card.

- [Getting started](GETTING_STARTED.md): the first account, first game and choice of setup path.
- [Teacher guide](TEACHER_GUIDE.md): authoring, practice, hosting, timing, podium celebrations, reports and audio.
- [Student guide](STUDENT_GUIDE.md): invitations, answering, scoring, reconnecting and sharing a result image.
- [School workspaces](WORKSPACES.md): modes, invitations, roles, private sharing and migration.
- [Question imports](QUIZ_IMPORTS.md): AI generation prompt, supported JSON fields, limits and validation.
- [Live games](LIVE_GAMES.md): authoritative scoring, timing, connections and room lifecycle.
- [Troubleshooting](TROUBLESHOOTING.md): common setup, joining and development problems.

### Installation operators

- [Cloudflare deployment](DEPLOY.md): guided template and CLI deployment.
- [Private deployment](PRIVATE_DEPLOY.md): ignored targets, secrets and separate production builds.
- [Authentication](AUTH.md): teacher access, recovery, Google and email providers/templates.
- [Operations](OPERATIONS.md): updates, backups, configuration and classroom pilots.
- [Security](../SECURITY.md): reporting vulnerabilities and handling sensitive data.
- [Publishing](PUBLISHING.md): public-source hygiene, checks and known tooling advisories.

### Contributors

- [Contributing](../CONTRIBUTING.md): choosing, preparing and submitting a change.
- [Contribution requirements](CONTRIBUTION_REQUIREMENTS.md): signing, merge gates, security automation and live-setting verification.
- [Code of Conduct](../CODE_OF_CONDUCT.md): participation standards and reporting conduct concerns.
- [Development](DEVELOPMENT.md): prerequisites, commands, tests and generated files.
- [Architecture](ARCHITECTURE.md): code map, request flow and ownership boundaries.
- [Database schema](DATABASE_SCHEMA.md): D1 tables, migrations and Durable Object storage.
- [Social previews](SOCIAL_PREVIEWS.md): route metadata, artwork and privacy policy.
- [School implementation notes](SCHOOL_MODE_IMPLEMENTATION.md): Scope, verification and compatibility.
- [Roadmap](PLAN.md): implemented scope, next work and known limitations.
- [Feature proposals](FUTURE_FEATURES.md): Next collaboration improvements and other ideas for discussion.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) and [license](../LICENSE).

- [Screenshot tour](SHOWCASE.md): real screens for authoring, hosting, mobile play and reports.

## Glossary

| Term                       | Meaning                                                                                                                               | More detail                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Installation / instance    | One deployed copy of Funkwiz, operated in a Cloudflare account with its own configuration and data.                                   | [Deployment](DEPLOY.md)                               |
| Self-hosted                | You deploy and operate the app using your own cloud account.                                                                          | [Operations](OPERATIONS.md)                           |
| Teacher / host             | The signed-in person who creates quizzes, controls games and accesses reports. One in Personal mode; invited teachers in School mode. | [Teacher guide](TEACHER_GUIDE.md)                     |
| Student / player           | A participant who joins a game using a nickname, without an account.                                                                  | [Student guide](STUDENT_GUIDE.md)                     |
| Quiz                       | A reusable set of questions in the teacher library.                                                                                   | [Authoring](TEACHER_GUIDE.md#create-or-import-a-quiz) |
| Question                   | A prompt, exactly four answer choices, one correct choice and a duration.                                                             | [Import format](QUIZ_IMPORTS.md#format)               |
| Game / session / room      | One hosted run of a quiz, with its own code, participants, timing and results.                                                        | [Live games](LIVE_GAMES.md)                           |
| Lobby                      | The waiting area before the teacher starts a game.                                                                                    | [Joining](STUDENT_GUIDE.md#join-a-game)               |
| Game code                  | A six-digit invitation code shared with players. It is not a teacher credential.                                                      | [Joining](STUDENT_GUIDE.md#join-a-game)               |
| Private setup code / token | A secret for creating and recovering the bootstrap teacher account. Never share it with invitees or players.                          | [Authentication](AUTH.md)                             |
| Display mode               | Where question content appears: shared screen, student devices, or both.                                                              | [Display](TEACHER_GUIDE.md#choose-display-and-timing) |
| Reveal                     | The point when the correct answer becomes visible and answers are scored.                                                             | [Timing](LIVE_GAMES.md#timing-and-controls)           |
| Cooldown                   | The pause between reveal and the next question in automatic progression. Manual mode has no cooldown countdown.                       | [Timing](LIVE_GAMES.md#timing-and-controls)           |
| Practice / rehearsal       | A local preview with simulated host/student views; it does not open a room for a class.                                               | [Practice](TEACHER_GUIDE.md#practice-before-hosting)  |
| Report                     | Saved results accessible to the host and, in School mode, workspace Owners/Admins.                                                    | [Reports](TEACHER_GUIDE.md#review-and-export-results) |
| App origin                 | The exact scheme and hostname of the app, such as `https://quiz.example.com`, without a page path.                                    | [Authentication](AUTH.md#configuration)               |
| Secret                     | A private runtime setting, such as a signing key or SMTP password.                                                                    | [Private deployment](PRIVATE_DEPLOY.md)               |
| Migration                  | A versioned SQL change applied to a database's structure.                                                                             | [Schema](DATABASE_SCHEMA.md)                          |
| D1                         | Cloudflare's database service used for accounts, quizzes and saved reports.                                                           | [Architecture](ARCHITECTURE.md)                       |
| Durable Object             | A Cloudflare service that coordinates persistent state for a live room or join limiter.                                               | [Architecture](ARCHITECTURE.md)                       |
| Workspace                  | A School-mode boundary for a team’s members, private/shared quizzes and reports.                                                      | [Workspaces](WORKSPACES.md)                           |
| Personal mode              | The default single-teacher experience.                                                                                                | [Workspaces](WORKSPACES.md)                           |
| School mode                | An opt-in invite-only, multi-teacher experience for a school/team operating its own installation.                                     | [Workspaces](WORKSPACES.md)                           |

## Help improve these docs

If a guide assumes knowledge you do not have, tell us where you got stuck in a
[GitHub issue](https://github.com/OSSAfrica/funkwiz/issues), or submit a small docs
pull request. Use fictional data and omit credentials, database copies and learner
reports. See [contributing](../CONTRIBUTING.md).
