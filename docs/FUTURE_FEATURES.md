# Future features: Personal and School modes

[Documentation index](README.md) · [Current roadmap](PLAN.md) · [Architecture](ARCHITECTURE.md)

**Status: discussion draft.** These features are not implemented and do not imply
a release date. The agreed first audience for multi-teacher work is **a school or
team running its own installation**, rather than a public service where anyone
can sign up. Agreed decisions are listed below; the remaining design
recommendations still need agreement before coding.

## Agreed decisions

- Design the first multi-teacher experience for a school/team operating its own installation.
- Quizzes start as private drafts. Teachers explicitly choose **Share to workspace**
  to make selected quizzes available to colleagues. Workspace membership alone
  does not make a teacher's drafts shared.
- Workspace Admins can view all reports in their workspace, including reports
  hosted by other teachers. This permission is scoped to that workspace.

These decisions describe future behavior, not an implemented School-mode setting.
Sharing mechanics, editing rights and additional report permissions remain open.

## Personal and School modes

Recommendation: keep one application/codebase with two installation experiences.
Preserve the current low-setup experience for an individual teacher, then add an
invite-only School mode. This does not require a monorepo or separate frontend.

| | Personal | School |
| --- | --- | --- |
| Audience | One teacher operating their own app | A school/team sharing an installation |
| Status | Current behavior; “Personal” is a proposed mode label | Proposed |
| Teacher access | One configured email and private setup code | Invited accounts and workspace memberships |
| Organization UI | No workspace/member administration needed | Workspace switcher, invitations, membership and roles |
| Quiz library | Teacher-owned | Private teacher work plus deliberately shared workspace content |
| Learner reports | Current teacher only | Host access plus workspace-wide viewing for Admins; quiz sharing is separate |
| Students | Join by code/QR without accounts | Keep the same account-free joining experience initially |
| Operation | One configuration/database per installation | One operator manages the school deployment; workspaces are application boundaries |

A deployment might use workspaces for a science department, a tutoring team or a
school club. A teacher could belong to several workspaces with different roles.
Class rosters are a separate future concept; a workspace need not represent one class.

Choose the experience at initial setup. Converting an existing Personal instance
to School mode should be an explicit, backed-up migration. Switching School back
to Personal must not be a casual toggle that strands accounts or loses access.

## Keep the first School release focused

The first release should support an operator bootstrapping an owner, owners
creating workspaces, inviting teachers, selecting a workspace and controlling
access to quizzes, games and reports. Avoid public registration, subscriptions,
parent accounts and arbitrary custom role builders in this first step.

Invitations should be addressed to a teacher, expire, be revocable and be usable
once. Email invitations require a configured sender. If a copyable invite-link
alternative is introduced, it still needs identity/proof checks and must not
become unrestricted public signup.

The existing deployment setup code is a single-teacher recovery key. It must
**not** become a shared master password-reset code for every teacher. School-mode
bootstrap, per-account recovery and invitations need separate authorization paths.
Do not disable the teacher allowlist without replacing it with an invitation and
membership policy on every server boundary.

## Proposed roles

Start with three recognizable workspace roles. A role applies within its workspace;
being an owner of one workspace does not grant access to another.

| Role | Proposed responsibility | Boundary |
| --- | --- | --- |
| Owner | Workspace lifecycle, ownership transfer, membership and policy | Prevent removing the last owner; require explicit transfer/deletion flows |
| Admin | Invitations, membership, ordinary workspace settings and viewing all workspace reports | Workspace-scoped; cannot transfer ownership or delete the workspace |
| Teacher | Author quizzes, host games and review permitted results | Cannot administer membership or read unrelated teachers' private results |

**Agreed:** Admins can view every report belonging to their workspace. Ordinary
teachers retain access to their own hosted reports; wider teacher-to-teacher
sharing remains to be specified. Private quiz drafts remain private until shared.
Report viewing does not by itself grant report deletion or access to another
workspace. The Admin role and invitation flow should explain this report visibility.

An installation operator with cloud/database access remains able to administer
the underlying storage. Application roles do not remove that infrastructure access.
Schools needing separate operational ownership should use separate installations.

## Quiz collaboration without accidental disclosure

**Agreed:** quizzes start as private drafts, with an explicit **Share to workspace**
action, separate from the agreed Admin report-viewing permission. For the first
collaboration version, the recommendation is to let teachers copy a shared quiz
into their own editable draft. This is easier to
understand than simultaneous editing and avoids overwriting another lesson's content.

Questions to settle:

- Should publishing share a fixed revision or a library entry that its author can update?
- Who can unpublish or archive a shared quiz after its author leaves?
- Should personal drafts move into a workspace or remain a separate personal library?
- Do schools need co-editing immediately, or is share-and-copy enough?

Live rooms should keep their immutable quiz snapshot regardless of library edits.
Later co-editing would need conflict/version handling and an edit history, not only
an extra “editor” button. Public sharing needs a separate opt-in content policy:
the app's MIT license does not automatically publish or license users' question banks.

## Technical work behind the interface

These are proposed design requirements, not a completed migration specification:

| Area | Required design work |
| --- | --- |
| Identity | Replace the global teacher-only gate in School mode with authenticated membership/invitation checks; retain Personal behavior |
| Membership | Add workspace, membership and invitation records with server-enforced roles |
| Resource ownership | Define workspace scope, author/host identity and sharing grants for quizzes, live sessions and reports |
| Data queries | Scope reads and mutations by authorized workspace/resource access, including exports and copied content |
| Live rooms | Persist the authorized workspace context and check membership on host actions/reconnects, including revocation |
| Recovery | Separate owner bootstrap from each teacher's password recovery; do not share a deployment-wide reset key |
| Audit | Record invitations, role changes, sharing changes, ownership transfers and destructive actions without logging secrets |
| Removal | Decide what happens to hosted games, drafts, shared quizzes and reports when a teacher leaves |
| Operations | Keep sender credentials and cloud resource settings under operator control; scope quotas and usage fairly |

An active workspace ID in the browser is a navigation preference, not proof of
access. The server must check membership and the requested resource's scope on
each path. Tests need to attempt cross-workspace reads, writes, downloads and
WebSocket host commands, not just check that the workspace switcher looks correct.

Better Auth already provides an
[organization plugin for memberships, invitations and access control](https://better-auth.com/docs/plugins/organization).
It is worth evaluating against the installed version before building those
primitives ourselves. That plugin does not replace Funkwiz-specific quiz/report
authorization or the D1 migration design. Reuse existing shadcn/ui controls for the
switcher, invitations, member management and role selection.

## Migrating an existing installation

Proposed approach:

1. Back up and verify the current instance; keep the existing owner and resource IDs.
2. Create an initial workspace and owner membership with a versioned migration.
3. Assign existing quizzes/games/reports to that scope while preserving their host
   and privacy. Historical reports stay restricted from unrelated ordinary teachers;
   workspace Admins receive the agreed workspace-wide report visibility.
4. Enable invitations only after scoped authorization and revocation tests pass.
5. Pilot with two teachers and two workspaces, then verify existing Personal-mode
   installations remain usable without workspace setup screens.

Data migration, deployment-mode conversion and UI rollout should be reviewable
separately. No migration or new mode is being implemented by this discussion doc.

## Other useful features

| Candidate | Why it helps | Main work/tradeoff | Suggested order |
| --- | --- | --- | --- |
| Quiz duplication, folders and tags | Reuse lesson material without repeated exporting/importing | Library organization and clear copy behavior | Early teacher workflow improvement |
| Answer explanations | Turn reveal into a teaching moment | Authoring, validation, reveal views and report/export updates | Early learning improvement |
| Report deletion and retention settings | Give operators/teachers control over saved learner data | Authorization, confirmation, room/report lifecycle and backup implications | Before broader school adoption |
| CSV question import | Makes spreadsheet question banks easier to adopt | Format mapping, validation and the existing review flow | Early adoption improvement |
| Low-pressure game options | Support revision and groups that do not want public ranking | Configurable leaderboard/score presentation without changing answer secrecy | After core settings are specified |
| More question types | Support true/false, multi-select and other learning tasks | Data model, grading, protocol, authoring, reports and accessibility | Incremental, one type at a time |
| Question images/media | Support diagrams and visual learning | Storage, upload limits, content handling, alt text and PDF/room rendering | After the content model is settled |
| Co-hosting | Let a colleague help manage a session | Explicit host permissions, command conflicts and revocation | After School authorization |
| Self-paced assignments | Allow practice outside a live session | New attempt/deadline model, return identity and reporting | Separate product phase |
| AI-assisted drafts | Reduce question-writing time | Provider/key setup, source/privacy policy, costs and mandatory review | After imports and authoring are solid |
| LMS integrations and school SSO | Connect with existing school workflows | Per-provider setup, identity mapping and ongoing maintenance | Driven by actual pilot demand |

The current app already has light/dark themes, reports, question visibility,
per-question timing and audio controls. Those are not future promises.

## Recommended delivery order

1. **Adoption and reliability:** clear docs, stable regression checks, verified
   deployment, and a real classroom pilot with useful feedback.
2. **Teacher essentials:** choose a small set such as quiz duplication, answer
   explanations, CSV import and report lifecycle controls.
3. **School foundation:** invitations, scoped roles, resource isolation, migration,
   audit and member-removal behavior. Keep public signup out of this milestone.
4. **Collaboration:** shared question libraries and then co-hosting/co-editing if
   teams need them. Make report sharing a distinct policy.
5. **Further learning workflows:** new question types, media and self-paced work,
   prioritized from school pilots rather than added all at once.

## Decisions to discuss next

1. **Workspace creation:** owners/operators create them initially, or can every
   invited teacher create one?
2. **Collaboration depth:** is share-and-copy enough for the first School release?
3. **Next small feature:** which classroom problem should we address before the
   workspace migration—reuse, explanations, spreadsheet import or result retention?

Bring a concrete example of the school/team workflow to an issue or design
discussion. Once these choices are agreed, turn the selected scope into a smaller
implementation plan with permission tests and migration acceptance criteria.
