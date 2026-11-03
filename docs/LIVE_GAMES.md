# Live classroom games

[Documentation index](README.md) · [Project overview](../README.md)

From the teacher library, choose **Host live**, select the display and progression
settings, and open the lobby. Students visit `/join`, enter the six-digit code and
a nickname, and wait for the teacher. They do not need an account. Copy the lobby
link to prefill the code, or choose **Show QR code** in the lobby. Students can
scan it with their phone camera to open that same join page; only a nickname is
needed. The QR graphic is generated in your browser. It uses the address you opened
the host screen from, so use a reachable app address when sharing with phones.

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

**Allow answer changes** defaults to off. Hosts can set it before opening the
lobby, then adjust it between questions just like visibility. The chosen setting
applies to the next question and persists until changed again; it cannot change
during an active question. Practice uses the same answer-choice rule.

The server owns deadlines and awards points only
when the answer is revealed. Correct answers earn **1,000 / 900 / 800 / 700** points for
first / second / third / all later correct submissions. Wrong or missing answers
earn 0 and do not consume a tier. Order resets per question and follows server
acceptance order, including when submissions have identical timestamps. Equal
scores share a rank. With editing disabled, the first choice stays locked. With
editing enabled, a different choice replaces the saved answer and receives a new
server acceptance position. Repeating the currently saved choice is a no-op,
including retries. Only final correct choices participate in scoring. Paused,
expired and revealed questions cannot be edited. Ending early scores the current question
and records only questions reached as asked.

Rooms already in progress when this scoring change is installed keep their
original flat scoring. Older reports retain their original values. New report
JSON includes a `scoring` object; older exports may use `pointsPerCorrect`. CSV
and PDF exports describe the scoring rules that applied to that game.

## Reconnecting and reports

Refreshing or reconnecting from the same browser restores a student's identity,
score, and latest saved answer through a private HttpOnly room cookie. Opening the same
student session in another tab replaces the previous connection. Clearing cookies
or switching browsers loses that identity. New students cannot join after start;
existing students can reconnect. Nicknames must be unique within the room.

The host can reconnect without restarting the timer. Automatic timing continues
when the host disconnects; manual games wait after reveal. Students see connection
status and reconnect feedback. Sound effects and background music have separate
controls and begin disabled.

In Personal mode, finished reports are available only to the signed-in teacher.
School hosts see their own reports, and workspace Owners/Admins can see all reports
in their active workspace; other hosts’ unasked questions are omitted. Report
access does not grant host controls. Removing a host’s workspace membership blocks
new protected commands/reads and closes their host sockets. They include the
full leaderboard, question response counts, accuracy, and PDF/CSV/JSON downloads.
See the [teacher report guide](TEACHER_GUIDE.md#review-and-export-results).

## Local development and production

Run `bun run db:migrate:local` after updating. The local app uses D1 and Durable
Objects emulated by the Cloudflare Vite plugin. These local development commands create no remote resources.

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
