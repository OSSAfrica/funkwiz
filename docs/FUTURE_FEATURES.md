# Future features and School-mode direction

[Documentation index](README.md) · [Workspace guide](WORKSPACES.md) · [Roadmap](PLAN.md)

The first School foundation is implemented. This page records the agreed
principles and discusses what comes next; it is not a promise of release dates.
For current setup and permissions, use the [workspace guide](WORKSPACES.md).

## Agreed principles

- Keep Personal mode straightforward for a single teacher.
- Serve schools/teams running their own installation before considering public signup.
- Let teachers belong to multiple workspaces with roles scoped to each workspace.
- Keep drafts private until their author explicitly shares them.
- Give workspace Admins access to reports in their workspace.
- Keep students' code/QR joining account-free.

The implementation uses one codebase with default Personal and opt-in School
experiences. It does not need a monorepo or separate frontend for these modes.

## Personal and School modes

|                 | Personal               | School foundation                                                                    |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| Status          | Implemented default    | Implemented opt-in                                                                   |
| Teacher access  | One configured teacher | Bootstrap owner plus invited accounts                                                |
| Organization UI | No team administration | Workspace selector, memberships, invitations and roles                               |
| Quizzes         | Teacher-owned          | Private drafts and explicitly shared source entries                                  |
| Collaboration   | Import/export          | Share-and-copy into a colleague’s own editable draft                                 |
| Reports         | Host only              | Hosts plus workspace Owners/Admins; unasked content is omitted for non-host managers |
| Students        | Join without accounts  | Same joining flow                                                                    |

Workspace creation is currently limited to existing Owners and the configured
bootstrap/operator account. A workspace can represent a department, tutoring team
or club; class rosters are a separate concept. Workspace deletion is disabled.

Owners/Admins administer application access. The cloud operator still controls the
underlying database and backups; application roles do not remove infrastructure
access. Use separate installations where operational ownership needs to be separate.

## Collaboration today and tomorrow

The current model gives authors explicit sharing control and lets colleagues
copy shared quizzes into private drafts. Editing a shared source updates that
entry. Existing copies and live-room snapshots remain independent. Unsharing
cannot retract copies already made or reports already saved.

Possible next steps need clearer use cases:

- **Versioned publication:** publish a fixed revision and make later changes an
  explicit update, instead of showing the latest shared source.
- **Co-editing:** allow colleagues to edit the same quiz, with conflict detection,
  version history and clear editing rights.
- **Library stewardship:** decide who can archive or maintain shared material when
  its author leaves, while preserving private drafts.
- **Teacher-to-teacher report sharing:** grant selected colleagues access without
  assigning the much broader Admin role.

Public question catalogs need a separate opt-in content/licensing policy. The
application's MIT license does not automatically publish users' question banks.

## Roles and report management

Owner, Admin and Teacher roles are implemented. Last-owner protection applies to
concurrent changes. Admins/Owners can review reports within their workspace but
cannot read unshared draft records, edit other authors' quizzes or take over a
host's controls. The workspace UI explains report visibility to invited teachers.

Decisions still worth discussing:

1. Which report deletion/retention controls should teachers and administrators have?
2. Should teachers be able to share individual reports with selected colleagues?
3. Should shared library stewardship outlive the original author, and under what rules?
4. Is share-and-copy sufficient for the first school pilots, or is co-editing essential?

Bootstrap and per-account recovery stay separate. The deployment setup code must
never become a master password-reset key for every teacher. School invitations
are expiring/revocable and use email-bound registration proofs; further lifecycle
features must preserve those boundaries.

## Other useful features

| Candidate                              | Why it helps                                     | Main work/tradeoff                                                          | Suggested order                       |
| -------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------- |
| Quiz duplication, folders and tags     | Reuse and organize lesson material               | Library organization and clear copy behavior                                | Early teacher workflow improvement    |
| Answer explanations                    | Turn reveal into a teaching moment               | Authoring, validation, reveal views and export updates                      | Early learning improvement            |
| Report deletion and retention settings | Control saved learner data                       | Authorization, confirmations, lifecycle and backup implications             | Before broader school adoption        |
| CSV question import                    | Adopt spreadsheet question banks                 | Format mapping, validation and review                                       | Early adoption improvement            |
| Low-pressure game options              | Support groups that do not want public ranking   | Configurable leaderboard/score presentation while preserving answer secrecy | After settings are specified          |
| More question types                    | Support true/false, multi-select and other tasks | Model, grading, protocol, UI, reports and accessibility                     | One type at a time                    |
| Question images/media                  | Support diagrams and visual learning             | Storage, upload limits, content handling, alt text and rendering            | After the content model is settled    |
| Co-hosting                             | Let a colleague help manage a game               | Explicit control permissions, command conflicts and revocation              | After School pilots                   |
| Self-paced assignments                 | Practice outside live sessions                   | New attempt/deadline model, returning identity and reporting                | Separate product phase                |
| AI-assisted drafts                     | Reduce writing time                              | Provider/key setup, source/privacy policy, costs and human review           | After imports and authoring are solid |
| LMS integration and school SSO         | Fit existing school workflows                    | Provider setup, identity mapping and ongoing maintenance                    | Driven by pilot demand                |

Themes, reports, per-question timing, question visibility and audio controls are
already available. A stable integration API, public signup, co-editing and homework
mode are not current capabilities.

## Recommended next steps

1. **Validate adoption:** complete regression checks, verify the public deploy-button
   flow and pilot real school networks and devices.
2. **Improve teacher essentials:** select a small set such as answer explanations,
   duplication, CSV import and result-retention controls.
3. **Learn from School pilots:** refine offboarding, audit visibility, sharing
   expectations and migration guidance before expanding role complexity.
4. **Deepen collaboration:** add versioned sharing or co-hosting/co-editing when
   schools demonstrate a need. Keep quiz and report permissions distinct.
5. **Expand learning workflows:** prioritize question types, media and self-paced
   work from actual classroom use rather than adding them all together.

Better Auth's [organization plugin](https://better-auth.com/docs/plugins/organization)
provides membership/invitation primitives used by the foundation. Funkwiz still
owns resource authorization, migration design and live-room revocation. Additional
features should keep those server boundaries explicit and reuse the existing
shadcn/ui and Tailwind foundations.

Bring a concrete school/team workflow to a design discussion or issue. Choose a
small scope with permission tests, migration criteria and documentation before
starting the next feature.
