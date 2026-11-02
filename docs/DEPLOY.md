# Deploy Funkwiz to Cloudflare

[Documentation index](README.md) · [Project overview](../README.md)

For your own deployment of this public repository, use the
[private deployment workflow](PRIVATE_DEPLOY.md) to keep account IDs, database
IDs, production settings and secrets out of Git. The guided template flow below
is intended for people creating their own copy of the project.

| Personal — one teacher                                                                                                                                                                               | School / organization — a teaching team                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Deploy Personal to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FOSSAfrica%2Ffunkwiz%2Ftree%2Fdeploy-personal) | [![Deploy School or organization to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FOSSAfrica%2Ffunkwiz%2Ftree%2Fdeploy-school) |

Each button preselects its mode and provisions a separate installation. The
[deployment guide](DEPLOY.md) explains initial account setup and teacher invitations.

## Guided deployment

The button opens Cloudflare's setup flow for the public source repository. Sign
in to Cloudflare and GitHub, choose your repository/Worker names, and review the
resources and configuration. Cloudflare creates your own copy of the source,
provisions a D1 database and the Durable Object bindings, and sets up Workers Builds.
An account and access to Workers, D1 and SQLite Durable Objects are required;
Cloudflare's account limits and charges apply.

Choose **Personal** for one teacher or **School / organization** for an invited
team. Each link uses a generated, standalone template from the same checked app
source. `FUNKWIZ_MODE` is prefilled with `personal` or `school`; keep that value
unless you intentionally chose the wrong template. It is not a secret.

Supply these four values in the setup form. Never reuse test fixtures or another
installation's secrets:

| Setting               | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`     | Exact HTTPS app origin, such as `https://funkwiz.YOUR-SUBDOMAIN.workers.dev`             |
| `TEACHER_EMAIL`       | Personal: your teacher email. School: the first administrator / installation owner email |
| `BETTER_AUTH_SECRET`  | Unique random secret, at least 32 characters                                             |
| `TEACHER_SETUP_TOKEN` | A second unique random secret, at least 32 characters                                    |

Generate each secret separately using a password manager or
`openssl rand -hex 32`. Store the setup token in your password manager; it is
needed for first registration and private-code password recovery. It is unrelated
to student game codes.

Find your `workers.dev` subdomain in Cloudflare's Workers & Pages dashboard and
combine it with the Worker name you choose. If the final URL differs, update
`BETTER_AUTH_URL` under the Worker's **Settings → Variables and Secrets** before
creating an account. Sign-in stays unavailable until required settings are valid.
Do not leave the local development URL in production configuration.

Use these Workers Builds commands (Bun is selected by the lockfile and pinned
`packageManager` field):

| Field          | Command                 |
| -------------- | ----------------------- |
| Build command  | `bun run build`         |
| Deploy command | `bun run deploy:worker` |

The deploy command applies pending migrations to the `DB` **binding** before
uploading the Worker. The binding name works even if you rename the database in
the setup form. The initial migration creates the schema; later deployments apply
only pending migrations. Review migrations and take appropriate backups when
updating an existing installation. Keep production migration/deploy commands out
of branch preview builds that share production resources.

After deployment, open `/login`:

| Account flow                                 | What is needed                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Personal owner: **Set up teacher account**   | Configured email, private setup code and a chosen password, once.                                                |
| School owner: **Set up first administrator** | Configured administrator email, private setup code and a chosen password, once. Then create the first workspace. |
| Invited teacher signup                       | The private invitation link, invited email and a chosen password. No administrator setup code.                   |
| Returning user login                         | Email/password, or Google when configured. No setup code.                                                        |

Optional Google setup uses the configured, verified initial-owner email instead
of the email/password setup form. Keep the installation code with the owner; do
not distribute it as a teacher invitation. Students use `/join` and need no account.

The two buttons become usable after the generated public template branches have
been published (see below). Their complete account-provisioning flow must be
checked on a real Cloudflare account; a local dry run verifies packaging but does
not provision.

## Optional School mode

The **School / organization** button preselects School mode. After first
administrator setup, create a workspace and invite teachers using
[School mode setup](WORKSPACES.md). For an existing Personal installation,
the runtime setting `FUNKWIZ_MODE=school`
enables workspaces after the release's migrations have been applied; it does not
open public teacher registration. The configured teacher email remains the
bootstrap/operator identity.

## Optional Google and email

The first deployment does not require OAuth credentials, email-provider keys,
SMTP or a Cloudflare email domain. Google stays hidden without both credentials;
email recovery stays unavailable without a configured provider and sender.
Private-code recovery remains available.

After deployment, add only the optional settings you need using Cloudflare's
Worker settings or `bunx wrangler secret put NAME`, then follow
[authentication/email setup](AUTH.md). Google needs a production callback at
`https://YOUR-APP/api/auth/callback/google`. Cloudflare Email additionally needs an
`EMAIL` sending binding and an onboarded sender/domain; it is not provisioned by
the default template. Do not put secrets in `VITE_` variables or Git.

## CLI deployment

For an existing clone, configure the intended Cloudflare account:

```sh
bun install --frozen-lockfile
bunx wrangler login
bunx wrangler d1 create funkwiz
```

Replace the all-zero `database_id` in `wrangler.jsonc` with the returned ID.
Keep the `DB` binding name. Set the four required runtime secrets separately:

```sh
bunx wrangler secret put BETTER_AUTH_URL
bunx wrangler secret put TEACHER_EMAIL
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put TEACHER_SETUP_TOKEN
bun run deploy
```

The CLI commands create/update remote resources only when **you** run them.
The deploy command builds first, applies remote migrations, then deploys. Local
`.dev.vars`, accounts and `.wrangler/state` are not uploaded as production data.
Import quiz JSON backups through the teacher interface if you need to transfer
quizzes; avoid uploading your local account database.

## Custom domains and verification

Configure the domain on your Worker, update `BETTER_AUTH_URL` to its exact HTTPS
origin, and update Google callbacks if enabled. Use one canonical origin for
sign-in, reset links and social cards.

Check teacher registration/sign-in, a student QR invitation, a timed question and
saved report downloads. Verify email only after configuring your own sender and
explicitly requesting a reset. [Social previews](SOCIAL_PREVIEWS.md) need a public
HTTPS URL for external platforms to crawl them.

References: [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/),
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/),
[D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## How the two templates stay current

The `deploy-personal` and `deploy-school` branches are generated from checked
`main` commits by the **Publish deployment templates** workflow. They contain the
complete app, with different mode defaults, generic Worker/database names and
setup descriptions. `deployment-template.json` records the source commit.

Application changes belong on `main`; do not edit generated branches. Publishing
uses ordinary fast-forward pushes and never resets main or other branches. The
publisher job is restricted to the upstream OSSAfrica/funkwiz repository and
skips installation copies. Workflow files otherwise remain byte-for-byte copies
of checked main; publication does not generate or modify workflows. Source contribution
commits retain the repository's signing requirements; generated configuration
commits use the automation bot's DCO sign-off without a private signing key.

On first release, merge the template workflow and wait for **Checks** and
**Publish deployment templates** to succeed before using the two links. A manual
workflow run on main can retry publication. Local builds validate the packages;
a complete Cloudflare clone/provisioning run still needs verification in a real
account. Cloudflare's [deploy-button documentation](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
explains how it copies standalone templates and provisions their resources.
