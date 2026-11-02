# D1 schema

[Documentation index](README.md) · [Project overview](../README.md)

Source: `src/db/schema.ts`. Migrations:
`migrations/0000_teacher_auth_and_quizzes.sql`, `migrations/0001_live_sessions.sql`,
`migrations/0002_fancy_microchip.sql`, `migrations/0003_school_workspaces.sql`,
and `migrations/0004_workspace_indexes.sql`.

| Table                     | Stored data                                                         | Constraints and indexes                                                           |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `user`                    | Teacher name, email, verified state, image, timestamps              | Text primary key; unique email                                                    |
| `account`                 | Credential hash or OAuth identity/tokens                            | User foreign key with cascade delete; user index; unique provider/account pair    |
| `session`                 | Session token, expiry, user, request metadata                       | Unique token; user foreign key with cascade delete; user index                    |
| `verification`            | Better Auth verification and OAuth state values                     | Identifier index and expiry                                                       |
| `rate_limit`              | Authentication request counters                                     | Unique limiter key                                                                |
| `live_session`            | Owner, room code, title, lifecycle times, status, final JSON report | Owner foreign key with cascade delete; owner/created-time and code/expiry indexes |
| `email_delivery_settings` | Teacher email-provider selection and update time                    | Teacher primary/foreign key with cascade delete                                   |
| `organization`            | School workspace name, slug and metadata                            | Unique slug; workspace primary key                                                |
| `member`                  | Workspace/user membership and role                                  | Unique workspace/user pair; user index                                            |
| `invitation`              | Invited email, role, status, expiry and inviter                     | Workspace/user foreign keys                                                       |
| `workspace_invite_proof`  | Hashed private registration proof for an invitation                 | Unique hash; invitation foreign key                                               |
| `workspace_audit`         | Actor, workspace, action, subject ID and timestamp                  | No secrets or learner-answer payloads                                             |
| `quiz`                    | Title, description, cover, question array, timestamps, owner        | Owner foreign key with cascade delete; owner/updated-time index                   |

Dates use SQLite integers with Drizzle `timestamp_ms` conversion. Booleans use
integers. Question arrays are validated and stored as JSON text. Each quiz write
uses fewer than 100 SQL parameters. Browser-draft migration uses a D1 batch of
individual inserts, each within that bound, rather than one large values list.

Personal quiz access requires the configured teacher's session and unscoped
resources. School access requires membership in the active workspace; own drafts
and explicitly shared entries are readable, while author-only mutations remain
scoped to that workspace. Mutations
scope deletes and conflict updates to the current owner. The client cannot assign
an owner or a server timestamp. Example quizzes remain static and are copied into
account drafts when edited; they are not deleted from the shared sample library.

The Better Auth Drizzle adapter is configured without SQL transactions because D1
uses its batch API for atomic groups of statements. The explicit draft-copy path
uses that batch API.

Generate a migration after editing the schema with `bun run db:generate`.
Apply it locally with `bun run db:migrate:local`. Apply to the configured remote
D1 database with `bun run db:migrate:remote` only when preparing that environment.
Never edit an already-applied migration to change the schema.

Local development uses `.wrangler/state`. Browser tests use isolated
`.wrangler/e2e-state`, `.wrangler/e2e-google-state` and
`.wrangler/e2e-school-state` directories that are reset
by the test runner. Production resources belong to the installation operator;
see [deployment](DEPLOY.md) and [private deployment](PRIVATE_DEPLOY.md).

## Live room storage

Each `GameRoom` Durable Object uses its own SQLite database:

| Table     | Purpose                                                                |
| --------- | ---------------------------------------------------------------------- |
| `room`    | One private quiz snapshot, authoritative state, deadlines and revision |
| `players` | Random ID, hashed reconnect token, unique normalized nickname, score   |
| `answers` | First choice per player/question, awarded flag, answer timestamp       |

Room transitions and score awards use synchronous SQLite transactions. Correct
answers and future questions stay in private room storage until their reveal.
Player tokens are random, stored only as hashes on the server, and sent to the
browser in HttpOnly same-site cookies. WebSocket attachments carry the authorized
role and identity across hibernation. Teacher connections also record session
expiry and check revocation on synchronization.

The final report is copied idempotently to `live_session` in D1 and retried after
transient failures. Room expiry clears room/player/answer rows; D1 reports remain
available through scoped server functions. In School mode the host and workspace
Owners/Admins can read reports; non-host managers receive asked questions only. See [live lifecycle and
limits](LIVE_GAMES.md).

## Email delivery preferences

Migration `0002_fancy_microchip.sql` adds `email_delivery_settings`, keyed by the
teacher's user ID with cascade deletion. It stores only the selected provider
(`resend`, `cloudflare`, or `smtp`) and update time. Credentials remain in server
configuration. Unauthenticated recovery reads the preference for the configured
bootstrap teacher email; operator-only server functions handle delivery settings changes.

## School scope and migration

The additive School migration adds nullable `workspace_id` to quizzes/live sessions,
private-by-default quiz `visibility`, and `active_organization_id` to sessions.
Existing records stay unscoped until the bootstrap owner explicitly moves them.
The move uses an atomic D1 batch, preserves IDs and refuses active Personal games.
Workspace report/library queries have dedicated indexes.

Better Auth's organization plugin uses the organization/member/invitation tables.
Its public HTTP routes are disabled in favor of the app's validated server functions.
Membership updates use conditional SQL so concurrent demotions cannot remove the
last Owner. Sharing state and its audit event are written atomically.

Live room metadata also carries workspace scope, including final report insertion
after transient failures. Host reads/commands/socket updates check current
membership; removal closes active host sockets. Membership deletion retains user
accounts, quiz records, reports and shared entries. See [workspaces](WORKSPACES.md).
