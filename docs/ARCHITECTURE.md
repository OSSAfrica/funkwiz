# Architecture and code map

[Documentation index](README.md) · [Development](DEVELOPMENT.md) · [Database schema](DATABASE_SCHEMA.md)

This describes Personal mode and the opt-in School workspace foundation. See
[workspaces](WORKSPACES.md) for permissions and [future features](FUTURE_FEATURES.md)
for ideas beyond the current implementation.

## System overview

```mermaid
flowchart LR
  Teacher[Teacher browser] --> App[Cloudflare Worker / TanStack Start]
  Student[Student browser] --> App
  App --> Auth[Better Auth]
  Auth --> D1[(D1)]
  App --> D1
  App --> Limiter[JoinLimiter Durable Object]
  App --> Room[GameRoom Durable Object]
  Room --> SQLite[(Room SQLite storage)]
  Room --> D1
  Teacher <-->|Live state over WebSocket| Room
  Student <-->|Filtered live state over WebSocket| Room
```

The Worker serves the React application and API requests. TanStack Start handles
server rendering, routes and server functions. A separate live API validates
requests and routes them to Durable Objects. The browser does not choose the
teacher owner, control authoritative timers or award its own points.

## Main flows

### Teacher access and authoring

Better Auth stores accounts and sessions in D1 through Drizzle. Personal mode and
School bootstrap access use the configured teacher email. Bootstrap email/password
registration requires the private setup code and closes after that account exists.
Invited School accounts instead require invitation-bound registration proof.
Google is configured only when both credentials are present.

In Personal mode the configured teacher gate remains in place. School mode uses
Better Auth organizations and membership records, with a server-validated active
workspace. Organization HTTP endpoints are disabled; scoped server functions
handle creation, invitations, selection and administration. New-account invitations
require a separate hashed registration proof, and member changes atomically protect
the last Owner.

Quiz server functions validate data and scope queries/mutations to the signed-in
author and workspace. Shared entries are readable/copyable by members, while only
authors edit or change sharing. Example quizzes are static server-side content; saving an edited example
creates account-backed content. Browser-only drafts are copied only through an
explicit, validated migration action.

### Live game

The teacher opens a room with a copy of a quiz. The live API checks the teacher
session and creates room metadata. A `GameRoom` Durable Object persists the quiz
snapshot, phase, deadlines, players and answers in its SQLite storage.

Students join with a code and nickname. Reconnect proofs use random tokens whose
hashes are stored server-side; the browser receives an HttpOnly room cookie.
The API assigns host/student roles after validation. Room code alone does not
authorize host commands or establish a returning player identity.

The server accepts the first answer and controls reveal/scoring. Alarms advance
automatic timers even if a host disconnects. Client views are filtered for the
role and display setting, so a student does not receive future questions or the
correct answer before reveal. WebSockets carry updates and host commands after
the authorized upgrade. Session checks also protect a returning host.

School rooms persist their workspace ID. Host reads, commands, socket upgrades
and broadcasts check the host’s current membership; removing access closes active
host connections. Report access does not grant host controls.

### Reports and exports

At game end, the final report is saved idempotently to D1 and retried after a
transient failure. The host reads their reports through scoped server functions. School Owners/Admins
also read reports within their active workspace, with unasked questions filtered
from other hosts’ reports.
The browser generates downloads. PDF rendering is loaded on demand; report exports
are not sent to an external PDF service.

### Email and social previews

React Email templates render on the server for account messages. Provider settings
select Resend, the optional Cloudflare Email binding, or SMTP; credentials remain
server-side. The account UI receives configuration status rather than credentials.

Social metadata is rendered in initial HTML. Static branded PNGs are public assets.
Preview copy excludes quiz/report content and reset tokens. See
[the social policy](SOCIAL_PREVIEWS.md).

## Where to make a change

| Area                           | Main files/directories                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Routes and root document       | [`src/routes`](../src/routes), [`src/router.tsx`](../src/router.tsx)                                                                     |
| Worker entry and live routing  | [`src/server.ts`](../src/server.ts), [`src/server/live-api.ts`](../src/server/live-api.ts)                                               |
| Live persistence and sockets   | [`src/server/game-room.ts`](../src/server/game-room.ts)                                                                                  |
| Quiz validation/model          | [`src/lib/quiz.ts`](../src/lib/quiz.ts), [`src/lib/quiz-storage.ts`](../src/lib/quiz-storage.ts)                                         |
| Account-backed quiz operations | [`src/lib/quizzes.functions.ts`](../src/lib/quizzes.functions.ts)                                                                        |
| Workspace scope and operations | [`src/lib/workspace.server.ts`](../src/lib/workspace.server.ts), [`src/lib/workspaces.functions.ts`](../src/lib/workspaces.functions.ts) |
| Workspace administration UI    | [`src/components/workspaces`](../src/components/workspaces)                                                                              |
| Authentication and recovery    | [`src/lib/auth.server.ts`](../src/lib/auth.server.ts), [`src/lib/recovery.server.ts`](../src/lib/recovery.server.ts)                     |
| Pure game transitions          | [`src/lib/live/engine.ts`](../src/lib/live/engine.ts)                                                                                    |
| Shared game messages and views | [`src/lib/live/protocol.ts`](../src/lib/live/protocol.ts), [`src/lib/live/view.ts`](../src/lib/live/view.ts)                             |
| Browser connection handling    | [`src/lib/live/use-live-room.ts`](../src/lib/live/use-live-room.ts)                                                                      |
| Teacher/quiz/live screens      | [`src/components/quiz`](../src/components/quiz), [`src/components/live`](../src/components/live)                                         |
| Shared UI primitives           | [`src/components/ui`](../src/components/ui)                                                                                              |
| Theme and styling              | [`src/styles.css`](../src/styles.css), [`src/theme.css`](../src/theme.css), [`src/lib/theme.ts`](../src/lib/theme.ts)                    |
| Audio policy and playback      | [`src/lib/live/audio-policy.ts`](../src/lib/live/audio-policy.ts), [`src/lib/live/game-audio.ts`](../src/lib/live/game-audio.ts)         |
| Emails/provider delivery       | [`src/emails`](../src/emails), [`src/lib/auth-email.server.ts`](../src/lib/auth-email.server.ts)                                         |
| Reports/PDF                    | [`src/lib/live/report-export.ts`](../src/lib/live/report-export.ts), [`src/lib/live/report-pdf.tsx`](../src/lib/live/report-pdf.tsx)     |
| Schema and migrations          | [`src/db/schema.ts`](../src/db/schema.ts), [`migrations`](../migrations)                                                                 |
| Social metadata and artwork    | [`src/lib/social.ts`](../src/lib/social.ts), [`scripts/social-card.ts`](../scripts/social-card.ts), [`public/og`](../public/og)          |
| Deployment tooling             | [`scripts/private-deploy.ts`](../scripts/private-deploy.ts), [`scripts/deploy-worker.ts`](../scripts/deploy-worker.ts)                   |

## Boundaries to preserve

- Authenticate and authorize on the server, including server functions and socket
  upgrades. A hidden button is not an access-control boundary.
- Validate untrusted input before persistence or room transitions. Derive identity
  and ownership from the session/cookie, not caller-supplied owner IDs.
- Filter game state before sending it to clients; visual hiding cannot protect a
  correct answer already included in a response.
- Keep deadline/scoring changes idempotent and persisted. Duplicate messages,
  reconnects and object eviction must not award points twice.
- Keep secrets and deployment identifiers out of tracked files and client bundles.
  Preserve the explicit public/private target checks before remote operations.
- Preserve legacy browser-storage keys when changing visible branding, so existing
  drafts and preferences remain accessible.

Internal live endpoints and server-function URLs are implementation details, not
a versioned public integration API. Discuss a stable integration contract before
building a third-party client against them.

## Decision: two generated deployment templates

Cloudflare copies a chosen template into a standalone repository, so two wrappers
that depend on parent-directory source would be incomplete. One link with a mode
field is simpler but does not satisfy distinct, preselected deployment choices;
two manually maintained app copies would drift.

The Personal and School links therefore target generated branches from the same
checked main source. Only public defaults and setup metadata differ. The tradeoff
is an extra publishing workflow and a brief delay after source checks complete.
A source-commit marker, source-only contribution policy, fast-forward publication
and an upstream-only publisher job keep that process auditable.
Revisit this choice if Cloudflare adds documented per-link variable presets.

## Decision: built Personal classroom on a private LAN

Offline classrooms use the existing Worker/D1/Durable Object application with
local runtime bindings and a prepared build. A separate `.classroom/` profile
holds credentials, assets and persistent state. A cached build avoids requiring a
development server or package downloads at the beginning of each class.

The initial launcher supports one Personal teacher and one explicitly selected
RFC1918 IPv4 origin over HTTP. Local-only configuration permits that origin for
authentication; the cloud deployment helpers reject classroom builds. Google
and email providers are unavailable in this profile. Students use existing
same-origin HTTP/WebSocket and lobby QR flows.

This reuses the proven application rather than introducing a second server or a
desktop runtime. The trade-offs are installed Bun/Node tooling, a running teacher
computer, unencrypted traffic on a trusted LAN and manual quiz JSON transfer
between installations. Revisit packaging, local HTTPS and School support after
physical-device classroom pilots.
