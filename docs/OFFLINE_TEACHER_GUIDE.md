# Run a classroom quiz without internet

[Documentation index](README.md) · [Technical setup](OFFLINE_CLASSROOM.md)

Use your laptop to run Funkwiz. Students join on their phones, tablets or other
computers. Everyone connects to the same classroom Wi-Fi or router. That network
can work without an internet connection.

This guide covers **Personal mode**: one teacher account on your laptop.

## What you need

- A laptop with Funkwiz installed and prepared for offline use.
- A Wi-Fi network or router that lets connected devices reach one another.
- A browser on each student’s device. Students do not install Funkwiz or create
  accounts.
- A charger for the teacher’s laptop.

The laptop runs the game and stores the results. Keep it awake and connected
until the session ends.

**Funkwiz is not installed yet?** Ask someone who helps with computers to follow
the [one-time technical setup](OFFLINE_CLASSROOM.md#prepare-while-online).
The current version starts through a terminal; it does not yet have a downloadable
installer or a desktop Start button.

## Do this once: prepare your teacher account

Complete this before your first lesson, while internet is available for setup.
Connect your laptop to the classroom Wi-Fi or router.

1. Open a terminal in the Funkwiz folder. A terminal is an app where you type
   commands. Ask your setup helper to show you how to open it in that folder.
2. Paste this command, then press Enter:

   ```sh
   bun run classroom --prepare
   ```

3. Enter the email address you want to use for your local teacher account when
   asked. Use your own address. Funkwiz will not send an email.
4. If asked to choose a network, select the one your students will connect to.
   Ask your setup helper if you are unsure.
5. Wait for **Classroom prepared**. The first preparation can take a few minutes.
6. Start Funkwiz:

   ```sh
   bun run classroom
   ```

7. Open the address beside **Teacher:** in your browser. Use the address printed
   on your laptop, even if a guide or another person shows a different one.
8. Choose **Set up teacher account**. Enter your name, the email you chose and a
   password with at least 12 characters.
9. To get your private setup code, open a second terminal in the same Funkwiz
   folder and run:

   ```sh
   bun run classroom:code
   ```

10. Copy that code into the setup form and finish creating your account. Save
    the code in a password manager; it also lets you reset a forgotten password.

Keep the setup code private. Students need the game QR code or game code from
the lobby, which is different. When you return, sign in with your email and
password; you do not need the setup code again.

## Every lesson: start, share, play

1. Connect your laptop and students’ devices to the same Wi-Fi network.
2. Plug in your laptop and open a terminal in the Funkwiz folder.
3. Run:

   ```sh
   bun run classroom
   ```

4. Open the **Teacher:** address printed in the terminal and sign in.
5. Choose a quiz and select **Host live**. Open the lobby.
6. Show the lobby QR code. Students scan it with their device’s camera and open
   the link. They enter a nickname to join.
7. If a student cannot scan, ask them to type the **Students:** address into
   their browser, then enter the game code shown in your lobby.
8. Check that your students appear in the lobby, then select **Start game**.

Leave the terminal open while playing. A projector or shared screen is optional;
choose where questions appear in the game settings. For a short, lively session,
aim for 7–10 questions.

## After the game

Open **Review game report** to see the results. Use **Download report** to choose
PDF, CSV or JSON. Funkwiz keeps saved quizzes and reports on this laptop so you
can return to them later.

When you have finished hosting, return to the terminal and press **Ctrl+C** to
stop Funkwiz. On a Mac, use Control+C here. You can then close the terminal.

## Quick help

| What happened?                           | What to do                                                                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A student cannot open the game           | Check that both devices use the same Wi-Fi. Use the latest address or QR code from your running session. A phone using mobile data alone cannot reach the laptop.       |
| Nobody can connect                       | Some guest/school networks block devices from reaching each other. Ask your setup helper to check the network and laptop firewall, or try a dedicated classroom router. |
| The address changed                      | Restart Funkwiz and use the newly printed address. Show a fresh lobby QR code. Avoid changing networks during a game.                                                   |
| Funkwiz asks for a network number        | Choose the network your students use. Ask your setup helper to identify it if several appear.                                                                           |
| The page closes or stops responding      | Check that the laptop is awake and Funkwiz is still running in its terminal. Keep the laptop lid open.                                                                  |
| I forgot my password                     | Choose **Forgot password** on the sign-in page and use your private setup code. Offline email recovery is unavailable.                                                  |
| I cannot find a quiz from the online app | Your offline laptop and online installation store separate copies. Export the quiz as JSON from the online app, then import that file on the laptop.                    |
| Preparation shows a long list of files   | Wait for **Classroom prepared**. If it ends with an error, share the error with your setup helper, keeping passwords and setup codes private.                           |

## Before your first class

Rehearse with two or three student devices. After preparation, disconnect the
router’s internet connection while leaving Wi-Fi on, start Funkwiz and play a
short quiz. Check that students can join, answer and see results. This catches
network problems before the full class arrives.

Use a trusted classroom network and a password you reserve for Funkwiz. Ask your
setup helper to make a backup of the laptop’s classroom data before updates or
moving to a different computer. The [technical guide](OFFLINE_CLASSROOM.md#local-data-and-backups)
explains which folder to copy.
