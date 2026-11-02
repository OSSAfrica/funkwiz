# Operating an installation

[Documentation index](README.md) · [Private deployment](PRIVATE_DEPLOY.md) · [Security](../SECURITY.md)

An installation operator controls the Cloudflare account, production configuration,
backups and access to the teacher account. Students join games without accounts.
Personal mode has one teacher. Opt-in [School mode](WORKSPACES.md) adds invited
teachers and workspace administration; cloud operations remain the installation
operator's responsibility.

## Configuration and secrets

Use [private deployment](PRIVATE_DEPLOY.md) when maintaining a personal production
instance from the open-source repository. Keep the account/database target in
`.deploy/target.json`, runtime secrets in `.deploy/secrets.json`, and secure backups
of both outside Git. The reusable public Wrangler template should remain generic.

For a new copy created through the deploy button, use [the template guide](DEPLOY.md).
Whichever path you choose, configure the exact HTTPS origin and your own Personal/bootstrap teacher
email. Google requires both OAuth credentials and a matching callback. Email reset
requires the selected provider and a sender; private-code recovery can work without it.

Changes to the private target's origin or teacher email require corresponding
changes in the private secrets file. The private deployment command stops if they
disagree. Review [authentication](AUTH.md) before changing identity/recovery settings;
changing the allowed email is not an account-ownership transfer workflow.

## Update safely

1. Review the incoming change and migrations. Commit or set aside your own source
   work before updating your checkout.
2. Back up relevant data and private configuration.
3. Install with `bun install --frozen-lockfile` and run the relevant checks from
   [development](DEVELOPMENT.md).
4. For an ignored private target, run `bun run deploy:private:dry-run` and then
   `bun run deploy:private`. This rebuilds, checks the target, applies remote
   migrations and uploads code with its secret file.
5. Verify sign-in, a test game and report downloads on the final URL.

`bun run deploy` uses the public-template configuration, while `deploy:private`
uses your ignored target. Do not substitute one for the other. A dry run validates
packaging, not the real network, email provider or classroom experience.

Code rollback is not database rollback. Do not reverse SQL changes blindly after
a deployment problem. Check compatibility and restore/recover data using the
provider's supported tools and a tested backup plan.

## Data and retention

| Data                                              | Where it lives                   | Current lifecycle                                                                                                           |
| ------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Teacher account, session and recovery records     | D1                               | Authentication/session expiry rules apply; account management is not an organization directory.                             |
| Saved quizzes                                     | D1                               | Kept until the author deletes them. Removing workspace membership retains their work and existing sharing state.            |
| Workspaces, memberships, invitations and activity | D1                               | School access records; invitation proofs expire/revoke and are consumed on acceptance. Workspace deletion is not available. |
| Live room, player identity and answers            | Durable Object SQLite            | A room starts with an eight-hour lifetime; finishing sets a 24-hour results lifetime. Expiry clears the room's rows.        |
| Completed report                                  | D1 `live_session`                | Persists after room expiry. There is no report-deletion interface or automatic report-retention policy yet.                 |
| Browser preferences and old local drafts          | Player/teacher device            | Remain until browser storage is changed/cleared or the browser handles it.                                                  |
| Downloaded exports                                | The device where they were saved | Outside the app's retention controls.                                                                                       |

Use nicknames appropriate to the context and tell participants how you use results.
Keep report downloads and database backups private. A room expiring does not delete
the saved D1 report or previously downloaded PDF/CSV/JSON files.

## Backups and recovery

For a teacher's question library, export quiz JSON regularly and test importing
it on a separate instance. These files transfer question sets, not accounts or
completed reports. Report downloads are useful records but are not full database
restore files.

For an operator-level backup of a private target, Wrangler supports a remote D1
SQL export. These commands read the configured production database and write a
sensitive file under the ignored directory; they do not restore or delete data:

```sh
mkdir -p .deploy/backups
bunx wrangler d1 export DB --remote --config .deploy/wrangler.json --output .deploy/backups/database.sql
```

The generated private Wrangler file must already exist. Use distinct backup
filenames for separate snapshots. Database exports contain account and classroom
records, so protect and store them appropriately. Check the export and practice
restoring to a **separate** test database before relying on it. D1 backups alone
do not capture live Durable Object rooms. Review Cloudflare's
[D1 export/import guidance](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
and your account's recovery features for an operational recovery plan.

For local development, stop the local server before backing up its private
configuration and complete `.wrangler/state` directory. Do not use test-state
directories as a backup of your normal local account.

## Classroom pilots and limits

Pilot on your deployment with a few real devices before a large class. Check:

- Reachable HTTPS invitation/QR URLs from the school Wi-Fi and student devices.
- Question visibility, manual/automatic progression and appropriate durations.
- Refresh/reconnect behavior and phones that sleep or switch tabs.
- Audio levels, muted starts, keyboard access and reduced-motion settings.
- Completion/report persistence and PDF/CSV/JSON downloads.

The code caps a room at 200 players and allows ten unexpired lobby/active games
per teacher. A join/state/socket-entry limiter permits 600 requests per minute per
IP; a school sharing an internet connection can be affected. A local 150-student
test is evidence about the local implementation, not a guaranteed production
capacity. See [live rules](LIVE_GAMES.md) and monitor your own account usage.

## Logs and support

Use Cloudflare's Worker logs and usage views to investigate failures. Keep raw
deployment logs, identifiers, credentials, reset links, learner names and report
payloads out of public issues. Share a redacted reproduction with fictional data.
Use [troubleshooting](TROUBLESHOOTING.md) and [security reporting](../SECURITY.md).
