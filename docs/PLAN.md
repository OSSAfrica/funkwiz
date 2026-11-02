# Funkwiz roadmap

[Documentation index](README.md) · [Project overview](../README.md)

## Product scope

One teacher hosts classroom quizzes for students who join using a code and
nickname. Each installation owns its teacher configuration and database.
Opt-in School mode supports invited teachers and scoped workspaces for a
school/team operating its own installation. Personal mode remains the default. See
[future features](FUTURE_FEATURES.md) for the next collaboration improvements.
An open-registration public service is outside the current scope.

School quizzes start as private drafts and are shared explicitly. Workspace
Owners/Admins can view all reports in their workspace, with unasked question
content omitted from other hosts’ reports. Shared quizzes are copied into a
colleague’s own draft for editing. See [the workspace guide](WORKSPACES.md).

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
- Opt-in School membership, expiring invitations, scoped roles, private sharing,
  Admin reports, explicit Personal-library migration and host-access revocation.
- Private deployment configuration, isolated build output and target guards that
  keep operator account/resource details out of the public template.
- Adoption/contribution guides, documentation index and glossary, teacher/student
  guides, operations reference and a separate future-feature discussion.

## Next work

- Add browser regression automation to CI, including School and capacity fixtures.
  Current CI covers library/Worker checks, typecheck, build and publishing hygiene;
  local browser verification is recorded in [implementation notes](SCHOOL_MODE_IMPLEMENTATION.md).
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
