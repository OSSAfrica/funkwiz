import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { liveSession } from "@/db/schema";
import { database, requireTeacher } from "@/lib/auth.server";

export const listLiveSessions = createServerFn({ method: "GET" }).handler(
  async () => {
    const teacher = await requireTeacher(getRequestHeaders());
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
      .where(eq(liveSession.ownerId, teacher.id))
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
    const teacher = await requireTeacher(getRequestHeaders());
    const row = await database()
      .select({ report: liveSession.report })
      .from(liveSession)
      .where(and(eq(liveSession.id, data), eq(liveSession.ownerId, teacher.id)))
      .get();
    return row?.report ?? null;
  });
