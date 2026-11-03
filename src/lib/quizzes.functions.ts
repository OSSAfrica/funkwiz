import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, or, isNull } from "drizzle-orm";
import { quiz as quizTable } from "@/db/schema";
import { database } from "./auth.server";
import { sampleQuizzes } from "./sample-quizzes.server";
import {
  requireWorkspace,
  workspaceScope,
  recordWorkspaceAction,
} from "./workspace.server";
import { z } from "zod";
import { prepareQuizForStorage } from "./quiz-storage";

export const listQuizzes = createServerFn({ method: "GET" }).handler(
  async () => {
    const scope = await workspaceScope(getRequestHeaders());
    if (scope.school && !scope.workspaceId) return [];
    const teacher = scope.user;
    const rows = await database()
      .select()
      .from(quizTable)
      .where(
        and(
          scope.workspaceId
            ? eq(quizTable.workspaceId, scope.workspaceId)
            : isNull(quizTable.workspaceId),
          or(
            eq(quizTable.ownerId, teacher.id),
            scope.workspaceId
              ? eq(quizTable.visibility, "workspace")
              : undefined,
          ),
        ),
      )
      .orderBy(desc(quizTable.updatedAt));
    return [
      ...rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        cover: row.cover,
        questions: row.questions,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        isExample: false,
        visibility: row.visibility,
        canEdit: row.ownerId === teacher.id,
      })),
      ...sampleQuizzes,
    ];
  },
);
export const persistQuiz = createServerFn({ method: "POST" })
  .validator(prepareQuizForStorage)
  .handler(async ({ data }) => {
    const scope = await requireWorkspace(getRequestHeaders());
    const teacher = scope.user;
    const now = new Date();
    const values = {
      id: data.id,
      ownerId: teacher.id,
      workspaceId: scope.workspaceId,
      title: data.title,
      description: data.description,
      cover: data.cover,
      questions: data.questions,
      createdAt: now,
      updatedAt: now,
    };
    const rows = await database()
      .insert(quizTable)
      .values(values)
      .onConflictDoUpdate({
        target: quizTable.id,
        set: {
          title: values.title,
          description: values.description,
          cover: values.cover,
          questions: values.questions,
          updatedAt: now,
        },
        setWhere: and(
          eq(quizTable.ownerId, teacher.id),
          scope.workspaceId
            ? eq(quizTable.workspaceId, scope.workspaceId)
            : isNull(quizTable.workspaceId),
        ),
      })
      .returning({
        id: quizTable.id,
        visibility: quizTable.visibility,
        createdAt: quizTable.createdAt,
      });
    if (!rows.length)
      throw new Error("This quiz could not be saved to your account.");
    return {
      ...data,
      createdAt: rows[0].createdAt.toISOString(),
      updatedAt: now.toISOString(),
      isExample: false,
      canEdit: true,
      visibility: rows[0].visibility,
    };
  });
export const removeQuiz = createServerFn({ method: "POST" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || id.length > 100)
      throw new Error("Invalid quiz identifier.");
    return id;
  })
  .handler(async ({ data }) => {
    const scope = await requireWorkspace(getRequestHeaders());
    const teacher = scope.user;
    await database()
      .delete(quizTable)
      .where(
        and(
          eq(quizTable.id, data),
          eq(quizTable.ownerId, teacher.id),
          scope.workspaceId
            ? eq(quizTable.workspaceId, scope.workspaceId)
            : isNull(quizTable.workspaceId),
        ),
      );
    return { success: true };
  });

export const copyBrowserDrafts = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (
      !Array.isArray(value) ||
      value.length < 1 ||
      value.length > 100 ||
      JSON.stringify(value).length > 1_000_000
    )
      throw new Error("Copy between 1 and 100 drafts, totaling at most 1 MB.");
    return value.map(prepareQuizForStorage);
  })
  .handler(async ({ data }) => {
    const scope = await requireWorkspace(getRequestHeaders());
    const teacher = scope.user;
    const now = new Date();
    const db = database();
    const statements = data.map((quiz) =>
      db
        .insert(quizTable)
        .values({
          id: quiz.id,
          ownerId: teacher.id,
          workspaceId: scope.workspaceId,
          title: quiz.title,
          description: quiz.description,
          cover: quiz.cover,
          questions: quiz.questions,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: quizTable.id }),
    );
    // D1 batch is atomic; conflicts never overwrite an existing account draft.
    const [first, ...rest] = statements;
    const results = await db.batch([first, ...rest]);
    return {
      imported: results.reduce((count, rows) => count + rows.length, 0),
    };
  });

export const shareWorkspaceQuiz = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({ id: z.string().min(1).max(100), shared: z.boolean() })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const scope = await requireWorkspace(getRequestHeaders());
    if (!scope.workspaceId)
      throw new Error("Choose a School workspace to share a quiz.");
    const visibility = data.shared ? "workspace" : "private";
    const action = data.shared ? "quiz.shared" : "quiz.unshared";
    const now = Date.now();
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE quiz SET visibility = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND workspace_id = ? RETURNING id",
      ).bind(visibility, now, data.id, scope.user.id, scope.workspaceId),
      env.DB.prepare(
        "INSERT INTO workspace_audit(id,workspace_id,actor_id,action,subject_id,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM quiz WHERE id = ? AND owner_id = ? AND workspace_id = ? AND visibility = ?)",
      ).bind(
        crypto.randomUUID(),
        scope.workspaceId,
        scope.user.id,
        action,
        data.id,
        now,
        data.id,
        scope.user.id,
        scope.workspaceId,
        visibility,
      ),
    ]);
    if (!results[0].results.length)
      throw new Error("Only the author can share this quiz in its workspace.");
    return { success: true };
  });
export const copyWorkspaceQuiz = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.string().min(1).max(100).parse(value))
  .handler(async ({ data }) => {
    const scope = await requireWorkspace(getRequestHeaders());
    if (!scope.workspaceId) throw new Error("Choose a workspace first.");
    const source = await database()
      .select()
      .from(quizTable)
      .where(
        and(
          eq(quizTable.id, data),
          eq(quizTable.workspaceId, scope.workspaceId),
          or(
            eq(quizTable.ownerId, scope.user.id),
            eq(quizTable.visibility, "workspace"),
          ),
        ),
      )
      .get();
    if (!source) throw new Error("This shared quiz is unavailable.");
    const copy = await persistQuiz({
      data: {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} (copy)`.slice(0, 120),
        updatedAt: new Date().toISOString(),
        questions: source.questions.map((question) => ({
          ...question,
          id: crypto.randomUUID(),
        })),
      },
    });
    await recordWorkspaceAction(
      scope.workspaceId,
      scope.user.id,
      "quiz.copied",
      source.id,
    );
    return copy;
  });
