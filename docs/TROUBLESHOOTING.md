# Troubleshooting

[Documentation index](README.md) · [Getting started](GETTING_STARTED.md) · [Development](DEVELOPMENT.md)

Start with the section matching what you see. Do not post private setup codes,
passwords, reset URLs, `.dev.vars`, `.deploy/` files or learner reports in an issue.

## Setup and sign-in

| Symptom                                | What to check                                                                                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login says configuration is incomplete | Set the required app origin, teacher email and authentication secret. See [authentication](AUTH.md). Restart local development after changing `.dev.vars`.             |
| Local setup still uses an old email    | `setup:local` preserves an existing `.dev.vars`. Review that file privately; rerunning the command does not overwrite it.                                              |
| No **Set up teacher account** button   | The allowed teacher may already exist, or the setup token may be missing/short. Sign in or use recovery rather than trying to create another teacher.                  |
| Registration rejects an email          | Personal mode requires the configured teacher email. School teachers need a valid private invitation; the configured email bootstraps the installation owner.          |
| Setup code is rejected                 | Use the private code for the correct environment. `setup:code` is local; `setup:code --production` reads private-production settings. A game code is never valid here. |
| Google button is absent                | It appears only with both Google credentials configured. This is expected for a basic installation.                                                                    |
| Google callback fails                  | Check the exact deployed origin and `/api/auth/callback/google` registration. See [Google setup](AUTH.md).                                                             |
| Email recovery is unavailable          | Select a provider and configure its credentials/sender. Choosing a provider alone does not enable delivery. Use private-code recovery if configured.                   |
| Reset link expired or used             | Request a fresh link. Tokens expire after 30 minutes, work once, and successful resets invalidate outstanding links.                                                   |

Use [the authentication guide](AUTH.md) for the complete configuration and recovery
behavior. Local and production databases/accounts are separate.

## Joining and live games

| Symptom                                            | What to check                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QR/link points at `127.0.0.1` or `localhost`       | Open the teacher screen on a reachable deployed address before generating invitations. Loopback links point to each student's own device.              |
| A code is rejected or a room is unavailable        | Confirm the app address, current code and whether the room expired or the game already started. New players join only in the lobby.                    |
| Nickname is taken                                  | Choose a different nickname. Matching is case-insensitive within the room.                                                                             |
| Only answer buttons appear                         | The teacher may have selected Shared screen mode. Read the projected question.                                                                         |
| Answer cannot be changed                           | The first submitted choice locks for that question.                                                                                                    |
| Answering is disabled                              | The game may be paused, revealed, finished, or disconnected. Check connection feedback.                                                                |
| Refresh creates no returning identity              | Reconnect from the same browser with its room cookie intact. A new browser/device or cleared cookies cannot restore that identity.                     |
| Another-tab message appears                        | The same player session was opened elsewhere. Continue in the intended tab.                                                                            |
| Automatic game advanced while the host was offline | Server timers continue. Reconnect to the same room rather than opening a new game.                                                                     |
| Some students hit a temporary join limit           | Shared school internet can place many requests behind one IP. Check [limits](LIVE_GAMES.md#local-development-and-production) and pilot the deployment. |

For School access, verify the active workspace and current membership. A Teacher
cannot open someone else’s unshared draft or report; an Admin can view reports
only within their workspace. Expired/revoked/used invitations need a new link.
See [workspace guidance](WORKSPACES.md).

## Reports, imports and audio

- **Import fails:** check [the JSON format](QUIZ_IMPORTS.md). CSV, report JSON and
  direct document extraction are not supported question-import formats.
- **Library changes do not appear in a running game:** a room copied the quiz when
  it opened. Open a new game to use edited questions.
- **Report absent:** confirm the game ended and that you are signed in to its
  teacher installation. A local practice rehearsal does not create a saved live report.
- **PDF download seems slow:** the first PDF use loads its renderer and fonts.
  Keep the tab open; try CSV/JSON if you need immediate structured output.
- **No music/effects:** browsers can block autoplay. Choose **Enable audio**
  when prompted, or use the separate controls. Check device volume and saved
  mute preferences. Audio rests while paused, disconnected or
  hidden; correctness feedback waits until reveal.
- **Lost local quizzes after deploying:** deployment does not copy your local
  database. Use quiz JSON exports/imports or the explicit Browser drafts migration
  where applicable.

## Development and deployment

- **Dependency/runtime mismatch:** use the pinned Bun version, a supported Node
  version and `bun install --frozen-lockfile`. See [development](DEVELOPMENT.md).
- **Invalid React hook call after dependency changes:** stop/restart the dev
  server and reload open tabs. Preserve the existing React deduplication and
  per-mode Vite cache configuration. Do not delete `.wrangler/state` to fix React.
- **Port already in use:** stop the process you started on that port or choose a
  free development port. Browser tests expect their fixture ports 3100/3101/3102 to be free.
- **Browser check fails intermittently:** inspect its trace and expected state,
  then run the relevant spec without source edits/hot reload. See [known work](PLAN.md).
- **D1 says a table is missing:** apply migrations to the intended environment.
  Local and remote commands are different; use the matching deployment guide.
- **Template database ID is rejected:** the public template has a placeholder.
  Use the deploy-button provisioning flow or configure your own ignored target.
- **Deployment target mismatch:** rebuild with the intended public/private
  command. Do not bypass the guard or edit a generated output config to force it.
- **Cloudflare/email permission error:** check the selected account, bindings and
  provider configuration. A selected provider is not proof that its sender is ready.
- **Social card missing on a sharing platform:** the final HTTPS URL and image must
  be publicly reachable. Localhost is not crawlable; platforms may cache old cards.

The build currently produces upstream source-map/font/PDF warnings. A successful
build still needs relevant behavior checks; an actual build error is not covered
by that known-warning note.

## Ask for help

Open a [GitHub issue](https://github.com/OSSAfrica/funkwiz/issues) with your revision,
runtime versions, local/deployed context, expected behavior and minimal steps using
fictional data. Include sanitized error text rather than raw configuration or reports.
Use [SECURITY.md](../SECURITY.md) for vulnerabilities and sensitive findings.
