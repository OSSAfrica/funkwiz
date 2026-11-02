# Teacher guide

[Documentation index](README.md) · [Student guide](STUDENT_GUIDE.md) · [Live game rules](LIVE_GAMES.md)

You need a teacher account for the installation you are using. Students do not
need accounts. If you have not signed in yet, follow [getting started](GETTING_STARTED.md).

In [School mode](WORKSPACES.md), select the workspace before authoring or hosting.
Your drafts are private until you explicitly share them. Shared workspace quizzes
can be copied into your own drafts; their original author keeps editing rights.

## Create or import a quiz

Create a quiz from your library, give it a title, and add questions. Each question
has exactly four answer choices, one correct choice and a duration from 5 to 300
seconds. Select the correct choice before saving.

The editor can apply a common duration to every question. You can then adjust
individual questions; for example, use 15 seconds for recall and 60 seconds for
a question that needs calculation. A quiz contains 1–100 questions.

You can edit an included example to save your own account-backed version. Sample
quizzes remain available. To bring questions from another tool, open **Import**,
paste or upload JSON, and review it before saving. See [question imports](QUIZ_IMPORTS.md).

Saved quizzes live in your teacher account's database. The library export action
downloads quiz JSON, useful for backups or moving questions to another installation.
A quiz export is different from a completed-game report.

## Practice before hosting

Choose **Practice** to rehearse question display, answer reveal and timing with
simulated host/student views. Use it to check wording and correct answers.
Practice does not create a live room, accept classroom participants or save a
completed classroom report.

## Choose display and timing

Choose **Host live** to configure a game and open its lobby.

| Setting               | What it does                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Shared screen         | Show question content on the host screen. Players still answer from their own devices.             |
| Student devices       | Show question content on player devices.                                                           |
| Both screens          | Show question content on both.                                                                     |
| Manual progression    | Each timer expires and reveals the answer; you choose when to advance. No cooldown countdown runs. |
| Automatic progression | Reveal the answer at expiry, wait the configured cooldown, then advance.                           |
| Per-question duration | Use the durations saved in your quiz; there is no single forced game-wide duration.                |

The room uses a snapshot of the quiz made when the lobby opens. Subsequent
library edits do not alter that game. Close it and open a new room if the question
content needs to change.

## Invite participants

Share the six-digit lobby code and your app's join address. You can copy a link
that fills in the game code or use **Show QR code** so phones open the invitation
directly. Participants still choose a nickname.

Open your host screen at an address students can reach. Invitations generated
from a loopback address are unsuitable for other devices. Test a deployed URL
before class. Start becomes available when at least one student is connected.

Wait for the group before starting: new players cannot join after the game starts.
Players already in the room can reconnect from the same browser.

## Control the live game

- **Pause/resume:** preserve the remaining question or cooldown time. Players
  cannot answer while paused. Opening game settings pauses an active timer.
- **Reveal early:** finish the current answering period and show the correct answer.
- **Next question:** advance after a reveal in manual mode.
- **Display changes:** change visibility between questions; it takes effect on the next one.
- **Progression changes:** switching to manual cancels a cooldown; switching to
  automatic during reveal begins a full cooldown.
- **End game:** finish early. The current question is scored, and the report marks
  only questions actually reached as asked.

Each player can submit one answer per question. Correctness is revealed together,
with 1,000 points for the first correct answer, 900 for the second, 800 for the
third and 700 for every remaining correct answer. Wrong answers earn 0 and do not
consume a tier. Order resets for each question. Equal scores share a rank. See [live game rules](LIVE_GAMES.md) for the exact lifecycle.

## Appearance and audio

Use **Appearance** for Light, Dark or System. System follows the device preference;
saved preferences apply to the current browser and synchronize across its tabs.

Music and sound effects attempt autoplay, with an **Enable audio** button when
your browser requires a tap. **Keep it quiet** mutes both. Preferences are saved
in this browser, and separate controls remain available. **Audio settings**
lets you adjust volumes and optional clock ticks. Music plays in the lobby and
final results, and softens during questions and feedback. Audio rests when paused, disconnected or in a hidden tab. Answer
feedback plays after reveal rather than exposing correctness early.

## Celebrate the finish

The completed host screen presents a bronze-to-gold podium reveal with a short
fanfare, spotlights, confetti and fireworks. All tied top-three finishers count;
a shared rank never becomes a separate placing. Extra tied names can be
expanded. **Skip animation** settles the stage and stops the reveal sound.

The sequence ends within five seconds and does not restart on refresh in the
same tab. Reduced-motion preferences show the podium with a brief fade and no
confetti, fireworks or moving lights. Reports and navigation remain available.

## Review and export results

Question reviews show class totals per choice. Incorrect choices that received
responses use the theme's destructive color and an **Incorrect selection** label.
The correct choice has a green highlight and **Correct answer** label, even when
nobody chose it. Unused wrong choices stay neutral. These are class totals, not
individual player answer histories.

Open the saved report after the game or return through recent games in the library.
Reports include a leaderboard and question response breakdown. The host can access their reports. In School mode, workspace Owners/Admins can
also review all reports in that workspace; their view of another host’s report
includes questions actually asked, preserving unasked question content. Downloads
use the authorized view. See [workspace report permissions](WORKSPACES.md#reports-and-offboarding).

Choose **Download report**:

| Format | Use it for                                                                   |
| ------ | ---------------------------------------------------------------------------- |
| PDF    | A readable, branded report for printing or sharing with intended recipients. |
| CSV    | Spreadsheet analysis of results and question/answer breakdowns.              |
| JSON   | The full structured report for your own tools. It is not a quiz-import file. |

Downloads are generated on your device. They can contain participant nicknames
and results, so choose appropriate names and recipients. There is no report-deletion
interface yet; see [operations and retention](OPERATIONS.md#data-and-retention).

## Move existing work

Use quiz JSON exports/imports to move question sets between local and production
installations. This does not transfer teacher accounts or completed reports.
If an older browser-only version left drafts on your device, use **Browser drafts**
to review and explicitly copy them into your signed-in account. Original browser
drafts are preserved, and existing IDs are skipped rather than overwritten.

For joining problems, see [troubleshooting](TROUBLESHOOTING.md).
