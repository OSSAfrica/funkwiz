# D1 schema

Source: `src/db/schema.ts`. Migrations:
`migrations/0000_teacher_auth_and_quizzes.sql` and `migrations/0001_live_sessions.sql`.

| Table          | Stored data                                                         | Constraints and indexes                                                           |
| -------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `user`         | Teacher name, email, verified state, image, timestamps              | Text primary key; unique email                                                    |
| `account`      | Credential hash or OAuth identity/tokens                            | User foreign key with cascade delete; user index; unique provider/account pair    |
| `session`      | Session token, expiry, user, request metadata                       | Unique token; user foreign key with cascade delete; user index                    |
| `verification` | Better Auth verification and OAuth state values                     | Identifier index and expiry                                                       |
| `rate_limit`   | Authentication request counters                                     | Unique limiter key                                                                |
| `live_session` | Owner, room code, title, lifecycle times, status, final JSON report | Owner foreign key with cascade delete; owner/created-time and code/expiry indexes |
| `quiz`         | Title, description, cover, question array, timestamps, owner        | Owner foreign key with cascade delete; owner/updated-time index                   |

Dates use SQLite integers with Drizzle `timestamp_ms` conversion. Booleans use
integers. Question arrays are validated and stored as JSON text. Each quiz write
uses fewer than 100 SQL parameters. Browser-draft migration uses a D1 batch of
individual inserts, each within that bound, rather than one large values list.

All quiz queries and mutations require the allowed teacher's session. Mutations
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
`.wrangler/e2e-state` and `.wrangler/e2e-google-state` directories that are reset
by the test runner. No production database has been provisioned by this change.

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
available only through owner-scoped server functions. See [live lifecycle and
limits](LIVE_GAMES.md).
