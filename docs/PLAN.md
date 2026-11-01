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
- [ ] Add transactional email verification and password recovery.
- [ ] Add validated CSV import. JSON import/export is already available.

Session/result tables will be added with the live-room implementation, when their
lifecycle and scoring fields are defined. Setup details live in `docs/AUTH.md`;
table details live in `docs/DATABASE_SCHEMA.md`.

### 3. Live classroom game

- Implement room lifecycle: lobby → question → reveal/cooldown → next → finished.
- Add student join and reconnect flows, nickname handling, authoritative deadlines,
  scoring, leaderboard, and duplicate/late-answer handling.
- Implement host-only controls and runtime mode/visibility changes.
- Add controlled audio, celebrations, and accessible game feedback.

### 4. Reliability and classroom pilot

- Test timing/state transitions with a controllable clock.
- Load-test at least 150 connected players, including a burst of answers,
  disconnect/reconnect, backgrounded phones, and a reconnecting host.
- Verify answer secrecy, host authorization, input limits, room cleanup, and costs.
- Run a classroom pilot before promising support for 100+ participants.

### Later

Built-in AI generation, image questions, additional question types, teacher sharing,
and richer reports. Decide scoring details and late-join behavior before live-game
implementation. Do not add these features to the first authoring slice.

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
