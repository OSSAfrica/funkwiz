# Getting started

[Documentation index](README.md) · [Teacher guide](TEACHER_GUIDE.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Pick your path

**Joining a teacher's game?** You do not need to install anything or create an
account. Open the teacher's invitation and follow the [student guide](STUDENT_GUIDE.md).

**Setting up the first teacher account?** The operator configures your email as
the bootstrap teacher address and provides the private setup code. Open `/login`
and create that account. This applies to Personal mode and the first School owner.
If the account already exists, sign in or use recovery.

**Invited to a School workspace?** Open your private invitation link and use the
invited email address to create an account or sign in. You do not need the
installation’s private setup code. See [School invitations](WORKSPACES.md).

**Trying Funkwiz yourself?** Use local development below. For a classroom where
students use separate devices, deploy a reachable instance with the
[Cloudflare guide](DEPLOY.md). To keep your own cloud details out of the public
repository, use [private deployment](PRIVATE_DEPLOY.md).

## Try it on your computer

Install Git, Bun 1.3.14 and Node.js 22.12 or newer. Node.js is needed by the
installed Vite/Wrangler tools; all project commands use Bun. Node.js 24 has been
used for development. You do not need Google OAuth or an email service to begin.

```sh
git clone https://github.com/OSSAfrica/funkwiz.git
cd funkwiz
bun install --frozen-lockfile
bun run setup:local you@example.com
bun run db:migrate:local
bun run dev
```

Replace `you@example.com` with your teacher email. The setup command creates
`.dev.vars` with fresh local secrets only if the file does not already exist.
If it already exists, review its settings privately; rerunning setup does not
change the teacher email or replace secrets. Never commit this file.

The migration command prepares your local database. It does not create or migrate
a production database. Keep the development terminal running while you use the app.

For a fresh invite-only School setup, use `bun run setup:local you@example.com --school`
instead. Existing configuration is preserved; see [workspace mode selection](WORKSPACES.md#enable-school-mode).

## Create the first teacher account

1. Open http://127.0.0.1:3000/login.
2. In a second terminal in the repository, run `bun run setup:code`.
3. Choose **Set up teacher account** and enter your name, configured email,
   password and private setup code.
4. Save the setup code in a password manager. Registration closes once the
   configured teacher account exists.

The code is a credential and a password-recovery key. It is unrelated to the
six-digit game codes you share with students. On a private production deployment,
use `bun run setup:code --production` instead; local and production codes differ.

## Try your first quiz

1. Open an included example or create a short quiz with two questions.
2. Give each question four answer choices, one correct choice and a time limit.
3. Save the quiz, then choose **Practice** to try the host/student views locally.
4. Choose **Host live**, set display and progression options, and open the lobby.
5. Open the student join link in a separate browser context, enter a nickname,
   then start the game once that participant is connected.
6. Complete the game and open its saved report.

Practice is a rehearsal, not a joinable classroom room. A live room copies the
quiz when it opens, so editing the library quiz does not change that game.

## Move to a real classroom

A `127.0.0.1` or `localhost` address points to the device opening it. A student
phone cannot use that link to reach the app on your computer. Use a reachable
deployment and open the teacher screen at that same address before sharing QR
codes or links.

Pilot with a few devices first. Test the school network, question visibility,
audio controls and reconnection before a large session. Students cannot join
for the first time after a game has started; existing players can reconnect.

## What to read next

- [Teacher guide](TEACHER_GUIDE.md): authoring, controls and reports.
- [Question imports](QUIZ_IMPORTS.md): bring a JSON question set.
- [Authentication](AUTH.md): recovery, Google and optional email providers.
- [Operations](OPERATIONS.md): configuration, updates and backups.
- [Development](DEVELOPMENT.md): commands, tests and contributor setup.
