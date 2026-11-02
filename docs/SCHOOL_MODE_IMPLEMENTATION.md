# School mode implementation

[Documentation index](README.md) · [Feature decisions](FUTURE_FEATURES.md)

Status: implemented. Personal mode remains the default; School requires an explicit
operator setting. Production configuration and data were not switched during this
implementation. See [the workspace guide](WORKSPACES.md) for adoption instructions.

## Scope

- Opt-in `FUNKWIZ_MODE=school`, retaining Personal authentication behavior.
- Better Auth organizations as workspaces, with Owner/Admin/Teacher memberships.
- Bootstrap owner can create the first workspace. Existing workspace owners can
  create additional workspaces. School registration is invitation-only except for
  the configured bootstrap teacher.
- Expiring, revocable invitations with a separate random proof for new-account
  registration. The deployment setup code cannot reset other teachers' passwords.
- Explicitly select a workspace; validate membership server-side. Existing data
  can be moved into the first workspace through an explicit owner action.
- Private quiz drafts, explicit sharing/unsharing, and copy-to-own-draft for
  shared material. Only authors modify drafts or sharing state.
- Hosts see their reports. Workspace Owners/Admins see all reports in that
  workspace. This does not grant access to private quiz drafts or host controls.
- Revoked membership stops subsequent resource access and live host commands.
- Use existing shadcn/ui controls and the app's color/appearance conventions.

## Verification

Verification recorded on 2026-11-02:

- 52 library/deployment tests and 24 Worker integration tests passed.
- All 69 browser scenarios passed across the broad regression run and focused
  rechecks, including four School scenarios and the 150-student capacity scenario.
  The initial broad run was not a clean single pass: affected and skipped specs
  were rerun after diagnosing local network suspension and allowing for the
  optional welcome email's eight-second timeout.
- School coverage includes invite-bound registration, expired/revoked links,
  private/shared quizzes, report roles, cross-workspace isolation, explicit legacy
  migration, membership removal and concurrent last-Owner protection.
- Worker checks cover revoked host reads/controls, closing existing host sockets,
  workspace report insertion, invitation email escaping and recovery guidance.
- Typecheck, production build, client-secret guard, public Worker packaging dry
  run, repository hygiene and staged Gitleaks checks passed.
- React Doctor reported no correctness errors; two maintainability warnings remain
  in the existing library screen (component size and control-flow complexity).

Browser email/Google fixtures use fake credentials. They verify configured UI and
local account flows, not real inbox delivery or a live Google consent/callback.
Production capacity and cloud provisioning still require an operator's own pilot.
