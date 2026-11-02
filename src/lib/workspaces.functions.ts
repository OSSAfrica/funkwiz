import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { and, desc, eq, isNull, or, gt } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import {
  invitation,
  member,
  organization,
  quiz,
  liveSession,
  user,
  workspaceAudit,
  workspaceInviteProof,
} from "@/db/schema";
import { createAuth, database, requireTeacher } from "./auth.server";
import { isTeacher, schoolMode } from "./auth-policy";
import { canManageMembers, isWorkspaceRole } from "./workspace-policy";
import { invitationHash } from "./school-access.server";
import { recordWorkspaceAction, requireWorkspace } from "./workspace.server";
import { sendWorkspaceInvitation } from "./auth-email.server";
import { emailConfigured } from "./email-provider";
import { selectedEmailProvider } from "./email-settings.server";

async function schoolTeacher() {
  if (!schoolMode(env)) throw new Error("School mode is not enabled.");
  return requireTeacher(getRequestHeaders());
}
async function manager() {
  await schoolTeacher();
  const scope = await requireWorkspace(getRequestHeaders());
  if (!scope.workspaceId || !canManageMembers(scope.role))
    throw new Error("Workspace administrator access is required.");
  return { ...scope, workspaceId: scope.workspaceId };
}
export const getWorkspaceState = createServerFn({ method: "GET" }).handler(
  async () => {
    const teacher = await requireTeacher(getRequestHeaders());
    if (!schoolMode(env))
      return {
        school: false,
        memberships: [],
        active: null,
        canCreate: false,
        legacyQuizzes: 0,
        legacyReports: 0,
        activeLegacyGames: [],
      };
    const db = database();
    const memberships = await db
      .select({
        id: organization.id,
        name: organization.name,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, teacher.id));
    const session = await createAuth().api.getSession({
      headers: getRequestHeaders(),
    });
    const active =
      memberships.find(
        (item) => item.id === session?.session.activeOrganizationId,
      ) ?? null;
    const [legacyQuizzes, legacyReports] = await Promise.all([
      db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.ownerId, teacher.id), isNull(quiz.workspaceId))),
      db
        .select({
          id: liveSession.id,
          code: liveSession.code,
          title: liveSession.title,
          status: liveSession.status,
          expiresAt: liveSession.expiresAt,
        })
        .from(liveSession)
        .where(
          and(
            eq(liveSession.ownerId, teacher.id),
            isNull(liveSession.workspaceId),
          ),
        ),
    ]);
    return {
      school: true,
      memberships,
      active,
      canCreate:
        isTeacher(teacher.email, env) ||
        memberships.some((item) => item.role === "owner"),
      legacyQuizzes: legacyQuizzes.length,
      legacyReports: legacyReports.length,
      activeLegacyGames: legacyReports
        .filter(
          (game) =>
            (game.status === "lobby" || game.status === "active") &&
            game.expiresAt.getTime() > Date.now(),
        )
        .map((game) => ({ code: game.code, title: game.title })),
    };
  },
);
export type WorkspaceState = Awaited<ReturnType<typeof getWorkspaceState>>;

export const selectWorkspace = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.string().min(1).max(100).parse(value))
  .handler(async ({ data }) => {
    await schoolTeacher();
    await createAuth().api.setActiveOrganization({
      headers: getRequestHeaders(),
      body: { organizationId: data },
    });
    return { success: true };
  });
export const createWorkspace = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z.object({ name: z.string().trim().min(1).max(100) }).parse(value),
  )
  .handler(async ({ data }) => {
    const teacher = await schoolTeacher();
    const slug = `${
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45) || "workspace"
    }-${crypto.randomUUID().slice(0, 8)}`;
    const created = await createAuth().api.createOrganization({
      headers: getRequestHeaders(),
      body: { name: data.name, slug },
    });
    if (!created) throw new Error("Workspace creation did not complete.");
    await createAuth().api.setActiveOrganization({
      headers: getRequestHeaders(),
      body: { organizationId: created.id },
    });
    await recordWorkspaceAction(created.id, teacher.id, "workspace.created");
    return { id: created.id };
  });

export const getWorkspaceManagement = createServerFn({ method: "GET" }).handler(
  async () => {
    const scope = await manager();
    const db = database();
    const [members, invitations, audit] = await Promise.all([
      db
        .select({
          id: member.id,
          userId: member.userId,
          role: member.role,
          name: user.name,
          email: user.email,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, scope.workspaceId)),
      db
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, scope.workspaceId),
            eq(invitation.status, "pending"),
          ),
        ),
      db
        .select({
          id: workspaceAudit.id,
          action: workspaceAudit.action,
          subjectId: workspaceAudit.subjectId,
          createdAt: workspaceAudit.createdAt,
          actor: user.name,
        })
        .from(workspaceAudit)
        .innerJoin(user, eq(workspaceAudit.actorId, user.id))
        .where(eq(workspaceAudit.workspaceId, scope.workspaceId))
        .orderBy(desc(workspaceAudit.createdAt))
        .limit(30),
    ]);
    return {
      members,
      invitations,
      audit,
      emailEnabled: emailConfigured(env, await selectedEmailProvider(env)),
      actorId: scope.user.id,
      role: scope.role,
    };
  },
);

export const inviteWorkspaceTeacher = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        email: z.email().max(254),
        role: z.enum(["admin", "teacher"]),
        emailDelivery: z.boolean().default(false),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const scope = await manager();
    if (
      data.emailDelivery &&
      !emailConfigured(env, await selectedEmailProvider(env))
    )
      throw new Error(
        "Configure an email sender before sending invitations, or use a private invitation link.",
      );
    const email = data.email.trim().toLowerCase();
    const invite = await createAuth().api.createInvitation({
      headers: getRequestHeaders(),
      body: { email, role: data.role, organizationId: scope.workspaceId },
    });
    const proof = randomBytes(32).toString("base64url");
    await database()
      .insert(workspaceInviteProof)
      .values({ invitationId: invite.id, tokenHash: invitationHash(proof) });
    await recordWorkspaceAction(
      scope.workspaceId,
      scope.user.id,
      "invitation.created",
      invite.id,
    );
    const url = new URL("/accept-invite", env.BETTER_AUTH_URL);
    url.searchParams.set("token", proof);
    let sent = false;
    if (data.emailDelivery) {
      const workspace = await database()
        .select()
        .from(organization)
        .where(eq(organization.id, scope.workspaceId))
        .get();
      try {
        await sendWorkspaceInvitation(
          env,
          email,
          url.href,
          workspace!.name,
          scope.user.name,
        );
        sent = true;
      } catch {
        /* The private link remains usable; report delivery status without provider details. */
      }
    }
    return {
      id: invite.id,
      url: url.href,
      sent,
      emailRequested: data.emailDelivery,
    };
  });

export const cancelWorkspaceInvitation = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.string().min(1).max(100).parse(value))
  .handler(async ({ data }) => {
    const scope = await manager();
    await database()
      .update(invitation)
      .set({ status: "canceled" })
      .where(
        and(
          eq(invitation.id, data),
          eq(invitation.organizationId, scope.workspaceId),
          eq(invitation.status, "pending"),
        ),
      );
    await recordWorkspaceAction(
      scope.workspaceId,
      scope.user.id,
      "invitation.canceled",
      data,
    );
    return { success: true };
  });

export const changeWorkspaceMember = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        memberId: z.string().min(1).max(100),
        role: z.enum(["owner", "admin", "teacher"]).optional(),
        remove: z.boolean().default(false),
      })
      .refine(
        (value) => value.remove || value.role,
        "Choose a role or remove the member.",
      )
      .parse(value),
  )
  .handler(async ({ data }) => {
    const scope = await manager();
    // Conditions run in the write statement, so concurrent changes cannot remove
    // the last owner or apply a permission granted by a stale membership read.
    const condition = `id = ? AND organization_id = ? AND EXISTS (SELECT 1 FROM member actor WHERE actor.user_id = ? AND actor.organization_id = ? AND actor.role IN ('owner','admin') AND (member.role != 'owner' OR actor.role = 'owner') AND (? != 'owner' OR actor.role = 'owner')) AND (role != 'owner' OR EXISTS (SELECT 1 FROM member other WHERE other.organization_id = member.organization_id AND other.role = 'owner' AND other.id != member.id))`;
    const target = await database()
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(
          eq(member.id, data.memberId),
          eq(member.organizationId, scope.workspaceId),
        ),
      )
      .get();
    const args = [
      data.memberId,
      scope.workspaceId,
      scope.user.id,
      scope.workspaceId,
      data.role ?? "teacher",
    ];
    const result = data.remove
      ? await env.DB.prepare(`DELETE FROM member WHERE ${condition}`)
          .bind(...args)
          .run()
      : await env.DB.prepare(`UPDATE member SET role = ? WHERE ${condition}`)
          .bind(data.role!, ...args)
          .run();
    if (!result.meta.changes)
      throw new Error(
        "This change is not permitted. Keep at least one owner and refresh your membership list.",
      );
    if (data.remove && target) {
      const games = await database()
        .select({ code: liveSession.code })
        .from(liveSession)
        .where(
          and(
            eq(liveSession.workspaceId, scope.workspaceId),
            eq(liveSession.ownerId, target.userId),
            or(
              eq(liveSession.status, "lobby"),
              eq(liveSession.status, "active"),
            ),
            gt(liveSession.expiresAt, new Date()),
          ),
        )
        .limit(10);
      await Promise.allSettled(
        games.map((game) =>
          env.LIVE_ROOMS.getByName(game.code).refreshHostAccess(),
        ),
      );
    }
    await recordWorkspaceAction(
      scope.workspaceId,
      scope.user.id,
      data.remove ? "member.removed" : "member.role-changed",
      data.memberId,
    );
    return { success: true };
  });

export const movePersonalLibrary = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z.object({ confirmed: z.literal(true) }).parse(value),
  )
  .handler(async () => {
    const scope = await manager();
    if (scope.role !== "owner" || !isTeacher(scope.user.email, env))
      throw new Error(
        "Only the installation owner can move the existing Personal library.",
      );
    const active = await env.DB.prepare(
      "SELECT id FROM live_session WHERE owner_id = ? AND workspace_id IS NULL AND status IN ('lobby','active') AND expires_at > ? LIMIT 1",
    )
      .bind(scope.user.id, Date.now())
      .first();
    if (active)
      throw new Error(
        "Finish or close active Personal games before moving your library.",
      );
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE quiz SET workspace_id = ? WHERE owner_id = ? AND workspace_id IS NULL",
      ).bind(scope.workspaceId, scope.user.id),
      env.DB.prepare(
        "UPDATE live_session SET workspace_id = ? WHERE owner_id = ? AND workspace_id IS NULL",
      ).bind(scope.workspaceId, scope.user.id),
      env.DB.prepare(
        "INSERT INTO workspace_audit(id,workspace_id,actor_id,action,created_at) VALUES(?,?,?,'library.migrated',?)",
      ).bind(crypto.randomUUID(), scope.workspaceId, scope.user.id, Date.now()),
    ]);
    return { success: true };
  });

export const getWorkspaceInvitation = createServerFn({ method: "GET" })
  .validator((value: unknown) => z.string().max(100).parse(value))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    setResponseHeader("Referrer-Policy", "no-referrer");
    if (!schoolMode(env) || !/^[A-Za-z0-9_-]{43}$/.test(data)) return null;
    const row = await database()
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        workspace: organization.name,
        expiresAt: invitation.expiresAt,
      })
      .from(workspaceInviteProof)
      .innerJoin(
        invitation,
        eq(workspaceInviteProof.invitationId, invitation.id),
      )
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .where(
        and(
          eq(workspaceInviteProof.tokenHash, invitationHash(data)),
          eq(invitation.status, "pending"),
        ),
      )
      .get();
    if (
      !row ||
      row.expiresAt.getTime() <= Date.now() ||
      !isWorkspaceRole(row.role)
    )
      return null;
    const registered = await database()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, row.email))
      .get();
    return {
      email: row.email,
      role: row.role,
      workspace: row.workspace,
      registered: Boolean(registered),
    };
  });
export const acceptWorkspaceInvitation = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.string().max(100).parse(value))
  .handler(async ({ data }) => {
    const teacher = await schoolTeacher();
    const proof = await database()
      .select({
        id: invitation.id,
        workspaceId: invitation.organizationId,
        email: invitation.email,
      })
      .from(workspaceInviteProof)
      .innerJoin(
        invitation,
        eq(workspaceInviteProof.invitationId, invitation.id),
      )
      .where(eq(workspaceInviteProof.tokenHash, invitationHash(data)))
      .get();
    if (!proof || proof.email !== teacher.email)
      throw new Error("Sign in using the invited email address.");
    await createAuth().api.acceptInvitation({
      headers: getRequestHeaders(),
      body: { invitationId: proof.id },
    });
    await database()
      .delete(workspaceInviteProof)
      .where(eq(workspaceInviteProof.invitationId, proof.id));
    await createAuth().api.setActiveOrganization({
      headers: getRequestHeaders(),
      body: { organizationId: proof.workspaceId },
    });
    await recordWorkspaceAction(
      proof.workspaceId,
      teacher.id,
      "invitation.accepted",
      proof.id,
    );
    return { success: true };
  });
