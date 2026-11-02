import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, isNull, isNotNull, or } from "drizzle-orm";
import { liveSession } from "@/db/schema";
import { database } from "@/lib/auth.server";
import { workspaceScope } from "@/lib/workspace.server";
import { canManageMembers } from "@/lib/workspace-policy";

export const listLiveSessions = createServerFn({ method: "GET" }).handler(
  async () => {
    const scope = await workspaceScope(getRequestHeaders());
    if (scope.school && !scope.workspaceId) return [];
    const teacher = scope.user;
    const rows = await database()
      .select({
        id: liveSession.id,
        code: liveSession.code,
        title: liveSession.title,
        status: liveSession.status,
        createdAt: liveSession.createdAt,
        expiresAt: liveSession.expiresAt,
      })
      .from(liveSession)
      .where(
        and(
          scope.workspaceId
            ? eq(liveSession.workspaceId, scope.workspaceId)
            : isNull(liveSession.workspaceId),
          or(
            eq(liveSession.ownerId, teacher.id),
            scope.workspaceId && canManageMembers(scope.role)
              ? isNotNull(liveSession.report)
              : undefined,
          ),
        ),
      )
      .orderBy(desc(liveSession.createdAt))
      .limit(20);
    return rows.map((row) => ({
      ...row,
      expired: row.expiresAt.getTime() <= Date.now(),
    }));
  },
);
export const readGameReport = createServerFn({ method: "GET" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || id.length > 100)
      throw new Error("Invalid report.");
    return id;
  })
  .handler(async ({ data }) => {
    const scope = await workspaceScope(getRequestHeaders());
    if (scope.school && !scope.workspaceId) return null;
    const teacher = scope.user;
    const row = await database()
      .select({ report: liveSession.report, ownerId: liveSession.ownerId })
      .from(liveSession)
      .where(
        and(
          eq(liveSession.id, data),
          scope.workspaceId
            ? eq(liveSession.workspaceId, scope.workspaceId)
            : isNull(liveSession.workspaceId),
          scope.workspaceId && canManageMembers(scope.role)
            ? undefined
            : eq(liveSession.ownerId, teacher.id),
        ),
      )
      .get();
    if (!row?.report) return null;
    return row.ownerId === teacher.id
      ? row.report
      : {
          ...row.report,
          questions: row.report.questions.filter((question) => question.asked),
        };
  });
