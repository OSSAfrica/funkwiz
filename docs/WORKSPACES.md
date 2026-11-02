# Personal and School workspaces

[Documentation index](README.md) · [Teacher guide](TEACHER_GUIDE.md) · [Authentication](AUTH.md)

Personal mode is the default: one teacher account, with no team-management setup.
School mode is an opt-in experience for a school/team operating its own Funkwiz
installation. It adds invited teacher accounts, multiple workspaces and scoped roles.
Students still join games by code or QR without choosing a workspace or creating an account.

## Enable School mode

For a fresh local setup:

```sh
bun run setup:local you@example.com --school
bun run db:migrate:local
bun run dev
```

`setup:local` preserves an existing `.dev.vars`. To convert an existing local
installation, apply migrations, add `FUNKWIZ_MODE=school` to that ignored file,
and restart development. Omitting it, or setting `personal`, keeps Personal mode.
Use the exact lowercase value `school`.

For [private production deployment](PRIVATE_DEPLOY.md), add
`"FUNKWIZ_MODE": "school"` to the existing ignored `.deploy/secrets.json`, then
run `bun run deploy:private`. That command applies the additive migrations before
uploading the updated app and runtime settings together. Keep the existing origin,
teacher email and signing/setup secrets. For a template deployment, apply the
release's migrations and configure the corresponding Worker runtime setting.

Do not change modes during a classroom game. Back up before converting an existing
installation. School mode does not automatically publish or move a Personal library.
Switching a populated School installation back to Personal is not a supported
account/data conversion workflow; the other teachers would lose access.

## Set up the first workspace

The configured `TEACHER_EMAIL` remains the installation's bootstrap/operator account.
Create or sign in to it using the existing authentication setup. The School welcome
screen lets this account create the first workspace, such as **Science crew**.
Existing workspace Owners can create additional workspaces too.

The creator becomes that workspace's Owner. Use the workspace selector to switch
between memberships. A teacher can have different roles in different workspaces.
The active selection is saved in the server session; every resource request still
checks membership rather than trusting the selection sent by a browser.

The installation operator manages cloud settings and email-provider credentials.
A workspace Owner is an application role; it does not automatically grant access
to the Cloudflare account or operator-only email-delivery settings.

## Roles and boundaries

| Action | Teacher | Admin | Owner |
| --- | --- | --- | --- |
| Create/edit own quizzes and host own games | Yes | Yes | Yes |
| Read another author's unshared draft | No | No | No |
| Copy shared workspace quizzes into own drafts | Yes | Yes | Yes |
| Share/unshare own quizzes | Yes | Yes | Yes |
| View own hosted reports | Yes | Yes | Yes |
| View other hosts' reports in this workspace | No | Yes | Yes |
| Invite Teachers/Admins and manage ordinary membership | No | Yes | Yes |
| Grant/remove Owner role or remove an Owner | No | No | Yes, while preserving at least one Owner |
| Create additional workspaces | No | No | Yes; the bootstrap/operator account can also create them |

Report access does not grant host controls, authoring rights or access to another
workspace. Owners/Admins reviewing someone else's report see the questions actually
asked; unasked question content stays private to the original host. Quiz content
that was asked is part of the report, even if the source quiz was not shared.

Workspace deletion, arbitrary custom roles and co-hosting are not implemented.
Role changes are checked on the server, and the last Owner cannot be removed or
demoted even by concurrent requests. To transfer ownership, promote another member
to Owner first, then change the previous Owner's role if appropriate.

## Invite a teacher

1. Open **Manage workspace → Invitations**.
2. Enter the intended teacher's email and choose Teacher or Admin.
3. Choose whether to send email as well, if the operator configured a sender.
4. Select **Create invitation** and copy the private invitation link before closing.
5. Share it only with the invited teacher. The link expires after 48 hours and is
   usable once. Revoke pending invitations from the same panel when needed.

The invited person opens the link, creates an account using that email or signs
in to their existing account, then joins the workspace. Optional Google sign-in
also uses the invited identity. A different signed-in account must sign out first.
There is no open registration for arbitrary teacher addresses.

The deployment setup code belongs only to the bootstrap account. Do not distribute
it to teachers as an invitation or a shared recovery code. Teachers recover their
own passwords by email; if email is unavailable, the operator must configure it.
Workspace roles do not grant permission to reset someone else's password.

The invitation URL is shown only when created; the database stores its registration
proof as a hash. If you lose a pending link, revoke the invitation and create a new
one. Invitation pages use no-store/no-referrer protections and generic social metadata.

## Keep drafts private and share deliberately

New quizzes are private drafts within the selected workspace. Use the share action
on your quiz card to **Share to workspace**. The **Shared library** tab lists those
entries; colleagues can choose **Copy to my drafts** to get their own editable copy.
They cannot edit, delete, host or change sharing on your original entry.

Your later edits update the shared source entry. Existing copies and running-game
snapshots remain independent. Making the source private again removes access to
that source for colleagues; it does not retract copies already made or change
reports/games already created. Deleting your source likewise leaves those copies.

The same teacher's drafts in a different workspace are kept separate. Select the
appropriate workspace before creating, importing, hosting or opening a report.

## Reports and offboarding

Teachers see their own recent games and reports. Owners/Admins also see completed
reports from other hosts in the active workspace. PDF/CSV/JSON downloads use the
report view that the server authorizes for that viewer.

Use **Manage workspace → Members** to change roles or remove access. Removal keeps
the person's account, drafts and reports; memberships in other workspaces remain
separate. Previously shared quizzes remain shared. Re-inviting a teacher to the
same workspace restores access to their retained work.

Removal blocks subsequent protected requests and host commands, and closes that
teacher's active host sockets for this workspace. It does not erase data already
downloaded. Finish games before removing a host where possible: automatic games
can continue on server timers, while manual games may need the host re-invited to
finish. Admin report access is not a co-host feature.

**Activity** shows recent workspace creation, invitation, membership, quiz-sharing
and library-migration events. It does not contain invitation secrets or learner answers.

## Move an existing Personal library

The original operator can create/select an owned workspace and choose **Move
Personal library** when legacy records exist. Review the quiz/game counts and
Admin report visibility, confirm you have a backup, then explicitly move the work.

The server moves only that operator's unscoped records, preserves resource IDs and
results, and keeps quiz visibility private. It refuses the move while unexpired
Personal games are active; the dialog links to those games so the host can finish
or close them. This is a move, not a second copy. New teachers do not receive
historical reports unless their role is Owner/Admin in the destination workspace.

For remaining proposals, including deeper collaboration and report-retention
controls, see [future features](FUTURE_FEATURES.md).
