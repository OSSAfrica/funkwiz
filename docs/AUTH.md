# Teacher sign-in and account storage

## Local setup

Use Bun. Run these commands from the repository root:

```sh
bun install
bun run setup:local your-teacher-email@example.com
bun run db:migrate:local
bun run dev
```

The setup command creates `.dev.vars` only if it does not exist. It generates a
random authentication secret and teacher setup token without printing either.
The file has private permissions and is ignored by Git. Existing configuration
is preserved. Use `.dev.vars.example` as a reference for manual configuration.

Visit http://127.0.0.1:3000/login. Select **Set up teacher account**, enter the
configured email and your own password, and enter the private setup code. To read
the code in your own terminal, run:

```sh
bun run setup:code
```

Do not paste the code, your password, or OAuth secrets into chat or commit them.
Registration is limited to the configured teacher email and requires the setup
code. After that account exists, registration closes. The private code also
serves as a password recovery key, so keep it private. Removing
`TEACHER_SETUP_TOKEN` and restarting/redeploying disables that recovery option.
The allowed teacher email is checked again on every authenticated quiz operation.

## Configuration

All configuration is server-side. Do not use `VITE_` variables for these values.

| Variable                                | Purpose                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `BETTER_AUTH_URL`                       | Exact app origin, such as `http://127.0.0.1:3000` locally                      |
| `BETTER_AUTH_SECRET`                    | Random secret of at least 32 characters                                        |
| `TEACHER_EMAIL`                         | The single email allowed to register and access the workspace                  |
| `TEACHER_SETUP_TOKEN`                   | Private token of at least 32 characters for registration and password recovery |
| `GOOGLE_CLIENT_ID`                      | Optional Google OAuth web client ID                                            |
| `AUTH_EMAIL_PROVIDER`                   | Deployment default: `resend`, `cloudflare`, or `smtp`                          |
| `CLOUDFLARE_EMAIL_REMOTE`               | Explicit opt-in after configuring a real remote binding locally                |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server and TLS connection settings                                        |
| `SMTP_USER`, `SMTP_PASSWORD`            | Private SMTP login credentials                                                 |
| `RESEND_API_KEY`                        | Optional Resend API key for password-reset delivery                            |
| `AUTH_EMAIL_FROM`                       | Verified sender email address for password resets                              |
| `GOOGLE_CLIENT_SECRET`                  | Optional matching Google OAuth client secret                                   |

Without the required URL, secret, and teacher email, sign-in fails closed and the
login page shows a setup message. Google is enabled only when **both** Google
values are nonempty after trimming whitespace. The login loader returns only an
enabled/disabled flag; it never returns the credentials. The same helper controls
whether the server registers the provider, so a hidden button is backed by an
unavailable provider.

## Google setup

Create a Google OAuth web application and register the callback URL:

```text
http://127.0.0.1:3000/api/auth/callback/google
https://YOUR_APP_ORIGIN/api/auth/callback/google
```

Use the exact host and port configured in `BETTER_AUTH_URL`. Set the client ID and
secret in `.dev.vars`, then restart the development server. For production, use
Worker secrets. Restrict the Google consent application's audience as appropriate
for your Google project.

Use the configured teacher email with Google. Newly created Google users must
have a verified email. Better Auth can link that trusted Google identity to the
existing teacher account. If you start with Google, open **Teacher account** in
the workspace and add a password to enable email/password sign-in as well.

Google's real consent/callback flow requires real credentials and has not been
tested against a live Google account. Automated checks use fake test-only values
to verify provider visibility and registration behavior; they do not contact
Google.

## Passwords and sessions

- Passwords must contain 12–128 characters. Hashing and verification use Better
  Auth's implementation; plaintext passwords are never stored by the app.
- The account dialog supports adding or changing a password. Password changes
  revoke other sessions.
- Sessions are stored in D1, last seven days, and refresh after a day of activity.
- Better Auth's origin/CSRF protections remain enabled. Authentication requests
  use a database-backed rate limiter and Cloudflare's connecting IP header.
- Password recovery is available from **Forgot your password?** on the sign-in page.
  Email verification is still a separate, unimplemented feature.

## Recover a password

Open `/forgot-password`. Two methods are available:

- **Private setup code:** enter the configured teacher email, your private setup
  code, and a new password twice. A student game code cannot recover the account.
  To read your local private code in your own terminal, use `bun run setup:code`.
- **Email link:** request a reset link at your teacher email. This option is enabled
  only when the selected sending provider is configured. Responses do not
  disclose whether the submitted email has an account.

Both methods require a 12–128 character password and revoke every existing teacher
session. You sign in again afterward. A Google-only teacher can also recover by
adding a password. Quizzes and reports are preserved.

Email links expire after 30 minutes and work once. Completing any reset invalidates
all outstanding reset links for the teacher. Expired or used links cannot change
the password. Reset pages use no-store and no-referrer policies; successful email
resets remove the token from the address bar. Attempts are rate limited.

The setup code remains a reusable recovery key until you change or remove it in
server configuration. It is never included in an email, URL, or browser bundle.
If you believe the code has been exposed, replace `TEACHER_SETUP_TOKEN` and restart
or redeploy. Keep a separate recovery method available before removing it.

### Choose an email provider

Open **Teacher account → Password reset email**. Choose **Resend**, **Cloudflare
Email**, or **Other SMTP service**, then save. The choice persists in D1 and takes
precedence over the deployment default `AUTH_EMAIL_PROVIDER` (`resend` when unset).
Only the allowed teacher can inspect or change it. Selecting a service that still
needs setup keeps email recovery disabled; it does not send through another
provider automatically.

Provider credentials stay in private server configuration. The account dialog
shows only provider names, configuration status, and the validated sender address.
Use a plain email address for `AUTH_EMAIL_FROM`, such as
`quiz@your-verified-domain.example`. Apply `bun run db:migrate:local` after updating
for the `email_delivery_settings` table.

#### Resend

Use the [Resend Email API](https://resend.com/docs/api-reference/emails/send-email).
Create a sending key and verify your sender/domain, then add locally:

```dotenv
AUTH_EMAIL_PROVIDER=resend
AUTH_EMAIL_FROM=quiz@your-verified-domain.example
RESEND_API_KEY=your-private-sending-key
```

#### Cloudflare Email

The app uses the native [`EMAIL` sending binding](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).
`wrangler.jsonc` includes `send_email: [{ "name": "EMAIL" }]`. Configure a sender
from a domain onboarded to Cloudflare Email Service, select Cloudflare Email in
the account dialog, and set `AUTH_EMAIL_FROM` on the Worker. No Resend key is used.

Local email bindings simulate delivery by default. To send real email during
local development, explicitly configure the binding with `remote: true` and set
`CLOUDFLARE_EMAIL_REMOTE=true`, using the Cloudflare account that owns the onboarded
domain. These settings send real mail when a reset is requested. Without that
explicit local opt-in, the app keeps Cloudflare email recovery unavailable rather
than reporting simulated delivery as a real send. In a deployed HTTPS app, the
native binding sends through its deployment account.

See [Cloudflare local email development](https://developers.cloudflare.com/email-service/observability/local-development/sending/).
No Cloudflare domain, sender identity, or remote email configuration was changed
by this implementation.

#### Other SMTP services

The app uses Nodemailer's ES module transport, with TLS required:

```dotenv
AUTH_EMAIL_PROVIDER=smtp
AUTH_EMAIL_FROM=quiz@your-domain.example
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-private-smtp-password
```

Port 587 (and other non-465 ports) requires STARTTLS. For implicit TLS, use port
465 with `SMTP_SECURE=true`; the app also defaults to implicit TLS when the port
is 465 and `SMTP_SECURE` is unset. Use your provider's SMTP credentials or an app
password where required. Certificate validation stays enabled, and plaintext
fallback is not allowed. Port 25 is rejected because [Workers blocks it](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).
Connections are closed after each send and have timeouts. See [Nodemailer SMTP
configuration](https://nodemailer.com/smtp/).

Restart development after editing `.dev.vars`. In production, configure the
selected service on the Worker; store API keys and SMTP passwords with Wrangler
secrets. `BETTER_AUTH_URL` must be the reachable HTTPS app origin. Never use a
`VITE_` prefix or commit real credentials. Reset links always use the configured
app origin.

The app waits for the selected provider to accept the message and reports errors
without silently trying another service. It uses
`/api/auth/request-teacher-password-reset`; Better Auth still validates and
consumes reset proofs, stores password hashes, and revokes sessions.

Tests use mocked email providers and disposable accounts. Live inbox delivery
still requires selecting and configuring a real sender/provider, then verifying
it with an explicit reset request.

## Existing browser drafts

After signing in, choose **Browser drafts**. Review the drafts and choose which to
copy to your account. Copying uses an atomic D1 batch, preserves originals, and
skips existing IDs instead of overwriting account quizzes. This operation never
runs automatically. JSON import/export is also available.

Saved account quizzes persist in the database backing the running app. Locally,
that is the D1 simulator under `.wrangler/state`; it is not a production cloud
database and is not automatically copied to production.

## Production preparation

No remote resources have been created or deployed. `wrangler.jsonc` contains a
clearly marked local placeholder database ID. Before deployment:

1. Provision a D1 database and replace the placeholder with its real ID.
2. Configure the production authentication URL, secret, allowed teacher email,
   and initial setup token through Worker environment configuration/secrets.
3. Apply migrations with `bun run db:migrate:remote` against the intended database.
4. If enabling Google, configure the matching production callback URL and both
   Google credentials.
5. Build/deploy, create the teacher account, and copy or import your quizzes.

Local `.dev.vars` values are not automatically deployed as production secrets.
Preserve `.wrangler/state` if you want to retain local accounts and quizzes.

## Verification

```sh
bun run typecheck
bun test src/lib
bun run test:e2e
bun run build
bun run check:client-secrets
```

Browser tests use separate disposable D1 databases and fake teacher identities on
ports 3100/3101. They never modify the normal local database or your teacher
account. Do not run the test Worker configurations as production deployments.

## References

- [Better Auth with TanStack Start](https://better-auth.com/docs/integrations/tanstack)
- [Google authentication](https://better-auth.com/docs/authentication/google)
- [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Authentication rate limits](https://better-auth.com/docs/concepts/rate-limit)
- [Cloudflare Vite plugin API](https://developers.cloudflare.com/workers/vite-plugin/reference/api/)

## React Email templates

Account mail is authored in `src/emails/templates/` with shared forest, gold and
cream branding in `src/emails/components/`. The server renders HTML and a plain
text alternative from the same template. All three configured providers use the
same content. Personal names and links are escaped by React.

- Welcome: sent after the teacher account is created, when a sender is configured.
- Password reset: a single-use recovery link, delivered before reporting success.
- Password changed: sent after a successful reset, password change, or password
  creation for a Google account. It includes an account-recovery link, never a
  password, setup code, or reset token. Reset notices are dispatched only after
  previous sessions have been revoked.

Optional welcome/security notification failures log a generic warning and do not
roll back an account action. With no configured sender, these notifications are
skipped. Reset email failures continue to be reported to the requester.

Preview locally with `bun run email:dev` at `http://localhost:3002`, or run
`bun run email:export` for static HTML in the ignored `.email-preview/` directory.
Preview props use fictional teacher details and non-working example links.
