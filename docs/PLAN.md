# Fun Quiz — product and implementation plan

## Purpose

Make classroom quizzes feel like a game, with one teacher hosting 100 or more
students. Students join with a game code and nickname; they do not need accounts.
The first teacher is the owner. Multi-teacher organizations are out of scope.

## Agreed behavior

- Create quizzes manually and import structured questions generated elsewhere.
  Validate imports, preview them, and allow corrections before saving. Start with
  JSON and add CSV. Built-in AI generation comes later.
- Question visibility has three modes: shared screen, student devices, or both.
  Choose a session default during setup. The host can change it between questions;
  changes take effect on the next question and persist until changed again.
  Students always have answer buttons, including in shared-screen mode.
- Every question has a time limit. Use one duration for all questions or custom
  durations per question. Applying a common duration provides a starting point
  for individual adjustments.
- Manual progression: expire the question timer, reveal the correct answer, and
  wait for the teacher to advance. There is no cooldown countdown.
- Automatic progression: expire the timer, reveal the answer, count down the
  configured cooldown, and begin the next question. The final question ends the
  game after its results; there is no extra question.
- During a session the teacher can pause/resume, switch progression modes, and
  change next-question visibility. Switching to manual cancels the cooldown.
- Question content/timings belong to the quiz. Display mode, progression, and
  cooldown are session settings so a quiz can be hosted differently each time.
- Results should support a final leaderboard and question-level review.

## Visual direction

A sunny classroom arcade: warm paper background, deep green navigation, tangerine
calls to action, butter yellow, lavender, and sky blue quiz covers. Rounded display
type, bold answer shapes, and friendly geometric illustrations create a playful
feel without distracting from question text. Use Tailwind CSS and shadcn/ui for
standard controls; customize the game surfaces.

Motion communicates feedback and state: brief button presses, card lifts, modal
entrances, and a small entrance stagger. Keep reading surfaces steady. Support
reduced motion, keyboard navigation, visible focus, and phone-sized screens. Sound
and music must have controls; browsers require user interaction before playback.

## Architecture direction

Keep one TanStack Start / React / TypeScript codebase deployed to Cloudflare
Workers using the existing Vite integration. Use server functions for teacher
operations, Better Auth for teacher access, D1 for quizzes and reports, and a
Durable Object per game room for authoritative timing, state, and WebSockets.
Validate the exact binding/export setup against installed versions before wiring
resources. No deployment or cloud resources are required for the initial UI slice.

The server must validate answers, enforce deadlines, keep correct answers away
from students until reveal, and score each player once. Room state must survive
reconnects. Client countdowns display server deadlines rather than deciding them.

## Delivery sequence and acceptance criteria

### 1. Product foundation and local authoring — complete

- [x] Record the agreed behavior and phased plan.
- [x] Build the colorful teacher library with responsive navigation and search.
- [x] Create/edit quizzes, questions, answers, correct choices, and durations.
- [x] Import validated JSON with review before saving.
- [x] Provide session setup for visibility, progression, and cooldown.
- [x] Provide a local rehearsal of question timing and session controls.
- [x] Persist drafts in this browser, with honest local-only status.
- [x] Verify key flows, mobile layout, reduced motion, TypeScript, and builds.

This phase has no authentication, multiplayer joining, production persistence, or
capacity guarantee. Rehearsal must be explicitly labeled and never present a fake
join code or simulated students as a real session.

### 2. Teacher access and durable quiz storage — core implemented locally

- [x] Better Auth email/password and optional Google, restricted to the configured teacher email.
- [x] Google hidden and disabled server-side unless both credentials are configured.
- [x] Private setup code protects initial email/password registration.
- [x] D1 schema/migrations for authentication, rate limiting, and owned quizzes.
- [x] Authenticated account storage and explicit migration of browser drafts.
- [x] Add/change password and sign-out controls.
- [ ] Provision production D1 and configure production secrets before deployment.
- [ ] Configure real Google OAuth credentials when ready; test the full provider callback.
- [x] Add password recovery by private setup code and expiring email link.
- [ ] Configure live reset-email delivery and add email verification.
- [ ] Add validated CSV import. JSON import/export is already available.

Session/result tables are now included in migration `0001_live_sessions.sql`. Setup details live in `docs/AUTH.md`;
table details live in `docs/DATABASE_SCHEMA.md`.

### 3. Live classroom game — implemented locally

- [x] Implement room lifecycle: lobby → question → reveal/cooldown → next → finished.
- [x] Add student join and reconnect flows, nickname handling, authoritative deadlines,
      scoring, leaderboard, and duplicate/late-answer handling.
- [x] Implement host-only controls and runtime mode/visibility changes.
- [x] Add controlled audio, celebrations, and accessible game feedback.

### 4. Reliability and classroom pilot — local checks implemented

- [x] Test transitions with a controlled clock and actual Workers alarms.
- [x] Force room eviction and verify identity, answers, deadlines and scoring survive.
- [x] Load-test 150 connected players, an answer burst, duplicates and reconnects.
- [x] Check answer secrecy, host authorization, input limits and room cleanup.
- [ ] Pilot the deployed app on school Wi-Fi with backgrounded phones and a reconnecting host.
- [ ] Measure production resource use and costs before promising 100+ participants.

### Later

Built-in AI generation, image questions, additional question types, teacher sharing,
and richer reports. Current scoring gives 1,000 points per correct answer, with
shared ranks for ties. New joins close at start; existing players can reconnect.
See `docs/LIVE_GAMES.md` for operating instructions and lifecycle limits.

## Implementation references

- shadcn/ui: https://ui.shadcn.com/docs/installation/manual
- Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/

## Validation of phase 1

- Bun frozen-lockfile install succeeds.
- TypeScript checks and production builds pass.
- 11 unit tests cover import boundaries and rehearsal transitions.
- 8 Playwright checks pass across desktop and phone viewports, covering authoring,
  import/review, export, reload persistence, runtime controls, layout, hydration,
  and reduced motion. Desktop and phone screenshots were visually inspected.
- React Doctor reports 100/100 across the full app.
- The build retains the upstream CSS source-map warning described in the README.
- Google Tasks was unreachable; this file is the available record of remaining work.

## Validation of phase 2

- Bun frozen-lockfile install, TypeScript, 18 unit tests, and production build pass.
- 21 browser checks pass against isolated D1 databases, including initial account
  setup, teacher restrictions, Google visibility with partial/full configuration,
  server-function authorization, password changes/session revocation, account
  persistence, browser-draft migration, and the existing authoring/rehearsal flows.
- Desktop and phone login screenshots were inspected.
- The normal local app was checked separately: teacher setup is available and
  Google is hidden with the actual local configuration. No real teacher account
  was created by the tests.
- The built client-assets check confirms the configured private values are absent.
- React Doctor's source checks are clean. Its artifact scanner reports a false
  positive for JOSE's literal PKCS#8 format marker in a server-only source map.
  The flagged source is `jose/dist/webapi/key/import.js`, and the Worker serves
  assets from `dist/client`, not `dist/server`. No private key or configured
  secret was present in that map. No scan suppressions were added.
- The existing CSS source-map warning remains.
- Real Google OAuth callbacks, password recovery email, and production deployment
  require external configuration and remain explicitly unverified.

## Validation of phase 3

- 26 unit tests pass; four isolated Workers tests pass, including forced eviction,
  automatic alarms, single scoring and expiry.
- The local capacity run passed with 150 connected simulated students, 150 answers,
  ten duplicate submissions and fifteen reconnects. Joins took 1,523 ms, the answer
  burst 673 ms, and reveal fan-out 118 ms. These are local measurements, not a
  production capacity guarantee.
- All 28 Playwright checks pass, covering desktop/phone authoring and live games,
  teacher access, Google visibility, reports, the 150-player scenario, and password
  changes revoking other sessions. Browser scenarios run serially to reduce local
  emulator contention; the capacity scenario still connects 150 players at once.
- The live-session migration is applied to the normal local development database.
- Host lobby, student reveal and reports were visually inspected on desktop and phone.
- Production builds and client private-value checks pass. The full sample bank
  stays server-side; the import template is still available in the teacher UI.
- React Doctor's full scan retains the previously documented JOSE format-marker
  false positive in a server-only source map. Its remaining source note concerns
  an effect guarded by cancellation checks and an AbortController, including a
  guard immediately after the awaited request and before applying its result. No rules were suppressed. These
  diagnostics are recorded rather than represented as a clean full scan.
- The upstream CSS source-map warning remains. Google Tasks was unreachable;
  this document records the deliverables and remaining pilot work.

## QR join option

- The live lobby includes **Show QR code**. Its accessible dialog displays a
  locally generated QR for the room's join link, with the game code prefilled.
- Students still choose a nickname. Numeric codes and copyable links remain
  available. The host address must be reachable from students' phones.
- The join form waits for hydration before accepting input, preventing an early
  native form submission from clearing a scanned code or nickname.
- Two browser checks decode the rendered QR with an independent decoder, follow
  its URL, join the room, and verify dialog focus on desktop and phone. Both pass.

## Teacher password recovery

The sign-in page links to setup-code and email recovery. The private setup code
now also acts as a reusable recovery key; it is not a student game code. Email
recovery is enabled with a Resend key and verified sender address. Both methods
revoke existing teacher sessions, preserve quizzes/reports, and require signing
in again. Email links expire in 30 minutes, work once, and are all invalidated
after a successful reset. See `docs/AUTH.md` for setup and operating details.

Live email credentials and inbox delivery remain external configuration work;
automated tests use a mocked sender and disposable accounts.

Recovery validation: 28 unit tests, nine Workers runtime checks, and all 37 browser
checks pass. Coverage includes wrong codes, other origins, sender failures, rate
limits, session revocation, Google-only account recovery, expired/reused email
proofs, pending-link invalidation, and desktop/phone recovery screens. The existing
150-student scenario also passes. Browser email-token fixtures use only the
disposable e2e database; runtime mail delivery is mocked. No real teacher password
was changed and no reset email was sent during implementation.

Production build, TypeScript and client private-value checks pass. The final route
cleanup was followed by six passing recovery browser checks. React Doctor retains
the documented server-only JOSE format-marker false positive and guarded live-room
effect warning, plus a maintainability warning for the bounded recovery form
controller. Route ordering and named route components were corrected; no scan
rules were suppressed.

## React development runtime and email-provider selection

The development crash traced to two browser React modules, despite matching
installed React/React DOM versions. Vite now isolates optimizer caches by mode,
prebundles React runtime entries, and deduplicates React resolution. Desktop and
phone regression checks open workspace and account dialogs on both localhost and
numeric loopback addresses without invalid hook calls. This fix is committed as
`7317f61`.

Teacher account settings now offer Resend, Cloudflare Email and other SMTP
services through shadcn/ui Select, including keyboard navigation and themed
popover colors. Provider preference persists in D1; credentials stay server-side. Email
recovery and sending use that same preference, with no silent provider fallback.
Cloudflare's default local simulation stays unavailable as a real reset sender;
SMTP uses mandatory TLS. Setup details are in `docs/AUTH.md`.

Validation of the provider update: 31 unit tests, 16 Workers runtime tests and all
43 browser checks pass, including both localhost/numeric-loopback dialog paths,
authorized provider changes, persistence across reopening/reload, anonymous access
rejection, password recovery, and the 150-player scenario. Production build,
TypeScript and client-secret checks pass. The local email-settings migration has
been applied and the native binding types regenerated. Provider screenshots were
inspected on phone. React Doctor adds no new findings to the previously recorded
three diagnostics. Live sender credentials and inbox delivery remain unverified;
email transports were mocked, and no real reset email was sent.

After switching to shadcn/ui Select, six desktop/phone provider and React-runtime
checks pass. The provider checks also verify the menu has an opaque themed
background and all three options.
