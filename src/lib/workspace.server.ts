import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { member, workspaceAudit } from "@/db/schema";
import { database, getTeacherSession } from "./auth.server";
import { schoolMode } from "./auth-policy";
import { isWorkspaceRole } from "./workspace-policy";

export async function workspaceScope(headers: Headers) {
  const session = await getTeacherSession(headers);
  if (!session) throw new Error("Sign in to continue.");
  if (!schoolMode(env))
    return {
      user: session.user,
      school: false as const,
      workspaceId: null,
      role: null,
    };
  const id = session.session.activeOrganizationId;
  const membership = id
    ? await database()
        .select()
        .from(member)
        .where(
          and(
            eq(member.organizationId, id),
            eq(member.userId, session.user.id),
          ),
        )
        .get()
    : null;
  return {
    user: session.user,
    school: true as const,
    workspaceId: membership?.organizationId ?? null,
    role:
      membership && isWorkspaceRole(membership.role) ? membership.role : null,
  };
}
export async function requireWorkspace(headers: Headers) {
  const scope = await workspaceScope(headers);
  if (scope.school && (!scope.workspaceId || !scope.role))
    throw new Error("Choose a workspace you belong to before continuing.");
  return scope;
}
export async function recordWorkspaceAction(
  workspaceId: string,
  actorId: string,
  action: string,
  subjectId?: string,
) {
  await database()
    .insert(workspaceAudit)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      actorId,
      action,
      subjectId,
      createdAt: new Date(),
    });
}
