# Deploy your own instance without publishing account details

[Documentation index](README.md) · [Project overview](../README.md)

The tracked `wrangler.jsonc` remains a generic open-source template. Personal
production configuration, resource IDs, secrets, logs and build output belong in
the Git-ignored `.deploy/` directory. The deploy button continues to provision a
separate installation for each person using the public template.

## Private target

Authenticate using `bunx wrangler login`. Create a D1 database in your intended
Cloudflare account, then create `.deploy/target.json` with your own values:

```json
{
  "accountId": "YOUR_32_CHARACTER_ACCOUNT_ID",
  "databaseId": "YOUR_D1_DATABASE_UUID",
  "databaseName": "your-database-name",
  "workerName": "your-worker-name",
  "origin": "https://your-worker.your-subdomain.workers.dev",
  "teacherEmail": "you@example.com"
}
```

Never force-add this directory to Git. Do not paste the generated secrets into an
issue, pull request or chat. A custom domain can be used after it is configured
for your Worker; its HTTPS origin must match the target and authentication settings.

## Build and deploy

```sh
bun run deploy:private:dry-run
bun run deploy:private
```

Both commands generate `.deploy/wrangler.json` from the current public template,
substituting your private target. They build into `.deploy/dist/`, leaving the
public `dist/` separate. The first run creates `.deploy/secrets.json` containing
the teacher email, app origin and two independent random secrets. Existing secrets
are preserved, and a target/settings mismatch stops the command for review.
The directory and configuration files receive restricted filesystem permissions.

The dry run performs local packaging checks only. The deploy command applies
pending migrations to your D1 binding and uploads the Worker with its secrets
using Wrangler's `--secrets-file` option. Credentials are read from the ignored
JSON file and never placed in command arguments. Optional secrets can be added to
that file as documented in [authentication setup](AUTH.md); omitted existing
secrets are preserved by Wrangler. Runtime variables configured in the dashboard
are preserved by the private configuration's `keep_vars` setting.

Build-target validation compares the account, Worker and D1 identifiers before
any remote migration or upload. Public deployment commands explicitly use the
public build and refuse a mismatched/private build, so Wrangler's last-build
redirect cannot silently choose your personal installation.

## First teacher account

Open your deployed `/login`, choose **Set up teacher account**, and use the email
from your private target with your own password. Read the production setup code
in your own terminal:

```sh
bun run setup:code --production
```

Store this code in a password manager. It also enables password recovery and is
different from your local development code. No local accounts, quizzes or reports
are uploaded by deployment; import quiz JSON through the teacher interface as needed.
Google and email remain optional and require separate configuration.

## Before pushing source

```sh
bun run check:public
git status --short
git diff --cached
```

The repository guard rejects tracked `.deploy/` files and checks tracked text
against your private target values and secrets without printing matching contents.
The private deployment also checks its built client for configured private values.
Keep a secure backup of `.deploy/target.json` and `.deploy/secrets.json`; ignored
files are not recoverable from Git.

Sources: [Vite configuration](https://developers.cloudflare.com/workers/vite-plugin/reference/api/),
[Wrangler deploy](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy),
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Validation

The private workflow has been exercised against a fresh Cloudflare installation:
database creation and migrations, atomic code/secrets upload, and anonymous live
browser checks passed. Sign-in/setup, private-route redirects, join-code-prefill,
dark mode, social-image hashes, and no-JavaScript reset-page protections were
verified. No teacher account was created and no email was sent during verification.

The library/deployment suite passes 48 tests, including target mismatch and
template-ID rejection. TypeScript, frozen Bun installation, private build/dry run,
public-file hygiene and private client-value checks pass. Personal deployment
identifiers and URLs are intentionally omitted from these tracked notes.
