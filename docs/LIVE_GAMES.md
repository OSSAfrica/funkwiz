# Live classroom games

From the teacher library, choose **Host live**, select the display and progression
settings, and open the lobby. Students visit `/join`, enter the six-digit code and
a nickname, and wait for the teacher. They do not need an account. Copy the lobby
link to prefill the code.

Start becomes available when at least one student is connected. A quiz is copied
into the room when it opens, so subsequent edits do not alter a running game.
Return through the library's recent games to resume hosting or open a saved report.

## Timing and controls

Each question uses its saved duration. The quiz editor supports applying one
duration to every question and then changing individual durations.

- Manual progression reveals the answer when time expires and waits for **Next
  question**. There is no cooldown countdown.
- Automatic progression reveals the answer, waits the configured cooldown, and
  advances. After the final reveal and cooldown, the game finishes.
- Pause preserves remaining question or cooldown time. Answers are disabled while
  paused. The host can also reveal early or end the game.
- Switching to manual cancels a cooldown. Switching to automatic during a reveal
  starts a full cooldown.
- Shared screen, student devices, and both are available at setup. During a game,
  display changes are available between questions and apply to the next question.
  Students always receive four answer buttons. Reveal shows the answer on both
  screens so students can review their choice.
- Opening settings pauses an active timer; resume explicitly when ready.

The server owns deadlines, accepts only the first answer, and awards points only
when the answer is revealed. Each correct answer earns **1,000 points**, with no
speed bonus. Equal scores share a rank. Ending early scores the current question
and records only questions reached as asked.

## Reconnecting and reports

Refreshing or reconnecting from the same browser restores a student's identity,
score, and locked answer through a private HttpOnly room cookie. Opening the same
student session in another tab replaces the previous connection. Clearing cookies
or switching browsers loses that identity. New students cannot join after start;
existing students can reconnect. Nicknames must be unique within the room.

The host can reconnect without restarting the timer. Automatic timing continues
when the host disconnects; manual games wait after reveal. Students see connection
status and reconnect feedback. Sound effects and background music have separate
controls and begin disabled.

Finished reports are available only to the signed-in teacher. They include the
full leaderboard, question response counts, accuracy, and a JSON download.

## Local development and production

Run `bun run db:migrate:local` after updating. The local app uses D1 and Durable
Objects emulated by the Cloudflare Vite plugin. No remote resources are created.

`127.0.0.1` links work only on the same computer. A classroom needs a reachable
app address. Production still requires a real D1 database ID, migrations,
authentication secrets, and deployment. Configure and test the final HTTPS origin
before sharing it with students. Google remains optional and hidden without both
credentials.

Rooms accept up to 200 students. Up to ten unexpired lobby/active games may be
opened per teacher. A public entry limiter allows 600 joins/state reads/socket
connections per minute per IP; a school sharing one internet connection should
include this in its pilot. Answer submissions use the student's room cookie.

A room expires eight hours after creation. Finished rooms remain available for
24 hours after finishing. Expiry deletes room data, player identities and answers
from the Durable Object. Teacher reports remain in D1; there is currently no
report deletion interface. Treat nicknames as part of the saved classroom record.

## Validation

- `bun test src/lib`: validation, timing, visibility, answer secrecy and ranking.
- `bun run test:workers`: real local Workers tests for eviction/reconnect,
  persisted answers, alarms, single scoring, expiry and WebSocket command limits.
- `bun run test:e2e`: separate teacher/student browsers on desktop and phone,
  authentication boundaries, gameplay, pause/resume, automatic cooldowns, saved
  reports, and the isolated 150-player check.
- `bun run test:e2e --project live-capacity --no-deps`: 150 simulated WebSocket
  students, a burst of answers, ten duplicate answers, fifteen reconnects,
  answer secrecy, scoring and report totals. Timing measurements are attached to
  the Playwright result.

Local load testing verifies the implementation in the local runtime. A deployed
classroom pilot must still check school Wi-Fi, backgrounded phones, actual
network latency, and production resource use before a 100+ student rollout.
