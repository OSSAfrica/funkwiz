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
code. After that account exists, setup closes. You can remove
`TEACHER_SETUP_TOKEN` from the environment after setup, then restart/redeploy.
The allowed teacher email is checked again on every authenticated quiz operation.

## Configuration

All configuration is server-side. Do not use `VITE_` variables for these values.

| Variable               | Purpose                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`      | Exact app origin, such as `http://127.0.0.1:3000` locally                       |
| `BETTER_AUTH_SECRET`   | Random secret of at least 32 characters                                         |
| `TEACHER_EMAIL`        | The single email allowed to register and access the workspace                   |
| `TEACHER_SETUP_TOKEN`  | Private token of at least 32 characters for initial email/password registration |
| `GOOGLE_CLIENT_ID`     | Optional Google OAuth web client ID                                             |
| `GOOGLE_CLIENT_SECRET` | Optional matching Google OAuth client secret                                    |

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
- Password reset emails and email verification messages need a transactional
  email sender and are not configured in this phase. There is no nonfunctional
  password-reset link. Keep your password available, or configure Google as a
  second sign-in method. The private setup code does not reset existing accounts.

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
