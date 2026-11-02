# Funkwiz roadmap

## Product scope

One teacher hosts classroom quizzes for students who join using a code and
nickname. Each installation owns its teacher configuration and database.
Multi-teacher organizations and a hosted multi-tenant service are outside the
current scope.

## Implemented

- Quiz authoring, validated JSON imports, examples and account-backed storage.
- Global/per-question timing, three visibility modes, and manual/automatic progression.
- Live games, QR invitations, reconnects, server timers, answer reveal and reports.
- Teacher authentication, private-code/email recovery and optional Google sign-in.
- Configurable Resend, Cloudflare Email and SMTP delivery with React Email templates.
- Branded PDF/CSV/JSON exports, light/dark/system appearance, accessible controls.
- Original calming music, timer ticks, reveal cues and independent audio controls.
- Server-rendered social metadata and branded cards that exclude private content.
- MIT licensing, public repository documentation and guided Cloudflare deployment.
- Private deployment configuration, isolated build output and target guards that
  keep operator account/resource details out of the public template.

## Next work

- Stabilize intermittent browser-test timing failures in account setup and report
  downloads, then obtain a clean complete regression run. Focused social-preview
  checks and production-preview checks pass; the last complete run did not.
- Verify the full deploy-button flow after the public repository is available.
  Local dry runs cannot exercise account provisioning, real inbox delivery or
  external social crawlers.
- Add CSV question imports with the same validation/review flow as JSON.
- Consider assisted question generation after import/authoring workflows are proven.
- Update the email-preview/schema tooling when upstream dependencies resolve the
  moderate esbuild, glob and minimatch advisories noted in the publishing guide.

## Behavior to preserve

Question visibility can change between questions. Manual progression has no
cooldown; automatic progression uses the configured cooldown. Every question has
its own duration, with a common-duration action available during authoring.
Correctness stays hidden until reveal. Student answers lock on first submission.

Use existing shadcn/ui primitives and Tailwind tokens. Maintain keyboard access,
reduced motion, fixed printable/report colors and independent music/effect controls.
Preserve legacy browser-storage keys so existing drafts and preferences survive
branding changes.

## Known limitations

- Production capacity needs verification on the operator's own account and network;
  local tests exercise a 150-student connection and answer burst.
- Optional email and Google sign-in require operator-owned credentials and setup.
- The build emits upstream font/PDF and CSS source-map warnings but produces bundles.
- Cloudflare deployment, production database provisioning and external social
  preview verification require an operator's Cloudflare account and public URL.
