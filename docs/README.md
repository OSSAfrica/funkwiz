# Funkwiz documentation

[Project overview](../README.md) · [Contributing](../CONTRIBUTING.md) · [Security](../SECURITY.md)

Funkwiz is a self-hosted live quiz app. This index helps you choose a guide without
needing to know how the app is built. The [glossary](#glossary) explains terms used
throughout the documentation.

**Current scope:** one teacher account per installation, with account-free student
joining. School workspaces and additional teacher roles are
[proposals](FUTURE_FEATURES.md), not current capabilities.

## Start with your goal

| Your goal | Read this first | Then |
| --- | --- | --- |
| Understand what Funkwiz does | [Project README](../README.md) | [Getting started](GETTING_STARTED.md) |
| Join a game | [Student guide](STUDENT_GUIDE.md) | Ask your teacher for the app link and game code |
| Write and run a quiz | [Teacher guide](TEACHER_GUIDE.md) | [Live game rules](LIVE_GAMES.md) |
| Bring an existing question set | [Question imports](QUIZ_IMPORTS.md) | [Example JSON](quiz-import-example.json) |
| Try it locally | [Getting started](GETTING_STARTED.md#try-it-on-your-computer) | [Troubleshooting](TROUBLESHOOTING.md) |
| Deploy a new copy | [Cloudflare deployment](DEPLOY.md) | [Authentication setup](AUTH.md) |
| Keep my production details out of Git | [Private deployment](PRIVATE_DEPLOY.md) | [Operations](OPERATIONS.md) |
| Maintain an installation | [Operations](OPERATIONS.md) | [Security policy](../SECURITY.md) |
| Contribute a change | [Contributing](../CONTRIBUTING.md) | [Development](DEVELOPMENT.md), [architecture](ARCHITECTURE.md) |
| Discuss the next features | [Feature proposals](FUTURE_FEATURES.md) | [Roadmap](PLAN.md) |

## Guides and reference

### Teachers and students

- [Getting started](GETTING_STARTED.md): the first account, first game and choice of setup path.
- [Teacher guide](TEACHER_GUIDE.md): authoring, practice, hosting, timing, reports and audio.
- [Student guide](STUDENT_GUIDE.md): invitations, answering and reconnecting.
- [Question imports](QUIZ_IMPORTS.md): supported JSON fields, limits and validation.
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
- [Development](DEVELOPMENT.md): prerequisites, commands, tests and generated files.
- [Architecture](ARCHITECTURE.md): code map, request flow and ownership boundaries.
- [Database schema](DATABASE_SCHEMA.md): D1 tables, migrations and Durable Object storage.
- [Social previews](SOCIAL_PREVIEWS.md): route metadata, artwork and privacy policy.
- [Roadmap](PLAN.md): implemented scope, next work and known limitations.
- [Feature proposals](FUTURE_FEATURES.md): Personal/School modes and other ideas for discussion.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) and [license](../LICENSE).

## Glossary

| Term | Meaning | More detail |
| --- | --- | --- |
| Installation / instance | One deployed copy of Funkwiz, operated in a Cloudflare account with its own configuration and data. | [Deployment](DEPLOY.md) |
| Self-hosted | You deploy and operate the app using your own cloud account. | [Operations](OPERATIONS.md) |
| Teacher / host | The signed-in person who creates quizzes, controls games and accesses reports. Currently one account per installation. | [Teacher guide](TEACHER_GUIDE.md) |
| Student / player | A participant who joins a game using a nickname, without an account. | [Student guide](STUDENT_GUIDE.md) |
| Quiz | A reusable set of questions in the teacher library. | [Authoring](TEACHER_GUIDE.md#create-or-import-a-quiz) |
| Question | A prompt, exactly four answer choices, one correct choice and a duration. | [Import format](QUIZ_IMPORTS.md#format) |
| Game / session / room | One hosted run of a quiz, with its own code, participants, timing and results. | [Live games](LIVE_GAMES.md) |
| Lobby | The waiting area before the teacher starts a game. | [Joining](STUDENT_GUIDE.md#join-a-game) |
| Game code | A six-digit invitation code shared with players. It is not a teacher credential. | [Joining](STUDENT_GUIDE.md#join-a-game) |
| Private setup code / token | A secret used to create and recover the teacher account. Never share it with players. | [Authentication](AUTH.md) |
| Display mode | Where question content appears: shared screen, student devices, or both. | [Display](TEACHER_GUIDE.md#choose-display-and-timing) |
| Reveal | The point when the correct answer becomes visible and answers are scored. | [Timing](LIVE_GAMES.md#timing-and-controls) |
| Cooldown | The pause between reveal and the next question in automatic progression. Manual mode has no cooldown countdown. | [Timing](LIVE_GAMES.md#timing-and-controls) |
| Practice / rehearsal | A local preview with simulated host/student views; it does not open a room for a class. | [Practice](TEACHER_GUIDE.md#practice-before-hosting) |
| Report | Saved results from a hosted game, accessible to its teacher. | [Reports](TEACHER_GUIDE.md#review-and-export-results) |
| App origin | The exact scheme and hostname of the app, such as `https://quiz.example.com`, without a page path. | [Authentication](AUTH.md#configuration) |
| Secret | A private runtime setting, such as a signing key or SMTP password. | [Private deployment](PRIVATE_DEPLOY.md) |
| Migration | A versioned SQL change applied to a database's structure. | [Schema](DATABASE_SCHEMA.md) |
| D1 | Cloudflare's database service used for accounts, quizzes and saved reports. | [Architecture](ARCHITECTURE.md) |
| Durable Object | A Cloudflare service that coordinates persistent state for a live room or join limiter. | [Architecture](ARCHITECTURE.md) |
| Workspace | A proposed boundary for a team's members and shared resources. It is not implemented yet. | [Future work](FUTURE_FEATURES.md) |
| Personal mode | The proposed name for continuing the current single-teacher experience. | [Future work](FUTURE_FEATURES.md#personal-and-school-modes) |
| School mode | A proposed invite-only, multi-teacher experience for a school/team operating its own installation. | [Future work](FUTURE_FEATURES.md#personal-and-school-modes) |

## Help improve these docs

If a guide assumes knowledge you do not have, tell us where you got stuck in a
[GitHub issue](https://github.com/OSSAfrica/funkwiz/issues), or submit a small docs
pull request. Use fictional data and omit credentials, database copies and learner
reports. See [contributing](../CONTRIBUTING.md).
