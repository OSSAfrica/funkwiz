# Frequently asked questions

[Documentation index](README.md) · [Scoring](SCORING.md) · [Teacher guide](TEACHER_GUIDE.md)

Every installation includes this kind of help at **`/help`**, available without
signing in. Open **Help & FAQ** from the library/sign-in screen, or **Help & scoring**
from student joining and live games. Live-game help opens in another tab so the
current game stays connected. The prepared offline build includes the help page;
external GitHub links still require internet.

## How do scoring and ties work?

New games rank by correct-answer count first, then time-based points, then precise
response timing. A correct answer earns 700–1,000 points. Wrong or missing answers
earn zero. More correct answers always beat fewer, even with a lower point total.
Identical results share a rank. See [worked scoring examples](SCORING.md).

## Can students change answers?

By default, the first choice locks. Teachers can allow changes at setup and change
the rule between questions. Only the final choice and its submission time count.
Repeating the saved choice is a no-op. Paused, expired and revealed questions do
not accept changes. See [live game rules](LIVE_GAMES.md).

## What is manual versus automatic progression?

Manual reveals the answer at timeout and waits for the teacher to advance.
Automatic waits for its configured 1–60 second cooldown after reveal, then advances.
Manual has no automatic cooldown. Teachers can pause, reveal early or end the game.
Each question supports 5–300 seconds, individually or with a common duration.

## Where are the questions shown?

Teachers choose the shared screen, student devices or both. If only answer buttons
appear on a student's device, read the shared screen. Changes made between questions
apply to the next question. See the [teacher guide](TEACHER_GUIDE.md).

## How many questions should a quiz have?

We recommend **7–10**, and keeping most classroom quizzes under 20 questions.
The editor supports 1–100. A focused quiz leaves time to discuss and explain answers.

## Do students need accounts? How do they join?

Students use a six-digit room code and a unique nickname, or scan the lobby QR code.
They need the correct installation's address, and must join before the game starts.
They never need the teacher's private setup code. See [joining](STUDENT_GUIDE.md).

## What happens after a disconnect or refresh?

The same browser can restore its identity, saved choice and score through its private
room cookie. Switching browsers/devices or clearing cookies loses that identity.
Automatic timers continue while the host reconnects. See [troubleshooting](TROUBLESHOOTING.md).

## Can I create a quiz with AI or import a document?

Use the import dialog's JSON example and AI prompt with your topic or document in
your preferred AI tool. Review the generated answers, then paste/upload JSON.
The app does not automatically read documents or call an AI service. See [imports](QUIZ_IMPORTS.md).

## What is practice mode?

Practice rehearses question flow with local host/student views. It does not connect
live participants or produce a saved multiplayer report. Open a live lobby to play
with a class.

## What do report percentages mean? What can I download?

Per-question and overall answer accuracy use submitted answers as the denominator.
One correct answer out of two submissions is 50%, even if another player did not
respond. Empty questions show **No answers**, while skipped questions show **Not asked**.

Teachers can download PDF, CSV or JSON. Names combine quiz title, room code and
UTC finish time with hyphens. Students can download an image of their own rank,
participant count, points and correct-answer count. See [reports](TEACHER_GUIDE.md#review-and-export-results).

## Who can see quizzes and reports in a school?

Quiz drafts are private until explicitly shared with a workspace. Teachers can copy
shared quizzes into their own drafts. Hosts can view their reports; workspace Owners
and Admins can review all reports in their workspace. Other teachers do not gain
access automatically. See [School roles and sharing](WORKSPACES.md).

## Personal or School mode: which should I install?

Personal is for one teacher. School supports invited teachers, multiple workspaces
and Owner/Admin/Teacher roles. Setup and day-to-day sign-in are different: the
private setup code protects initial registration and supported recovery, while daily
sign-in uses a password or Google when configured. See [setup](GETTING_STARTED.md),
[authentication](AUTH.md) and [School mode](WORKSPACES.md).

## What if I forget my teacher password?

Choose **Forgot password** on sign-in. Use supported private setup-code recovery or
email recovery when delivery is configured. Google sign-in appears only when its
credentials are available. See [authentication and email setup](AUTH.md).

## Can I use it with no internet?

Yes, using a prepared offline **Personal** classroom on the teacher's computer.
Everyone joins the same local Wi-Fi/hotspot and uses the displayed local link or QR
code. Keep the computer awake. Preparation initially needs internet. School mode is
not supported for offline classroom hosting. See [the offline walkthrough](OFFLINE_TEACHER_GUIDE.md).

## How do music and themes work?

Choose Light, Dark or System appearance. Music and effects have separate controls.
Browsers may require you to enable audio once; muting does not affect answering or
scores. Preferences stay in that browser. See [appearance and audio](TEACHER_GUIDE.md#appearance-and-audio).
