import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { quiz as quizTable } from "@/db/schema";
import { database, requireTeacher } from "./auth.server";
import { sampleQuizzes } from "./sample-quizzes.server";
import { prepareQuizForStorage } from "./quiz-storage";

export const listQuizzes = createServerFn({ method: "GET" }).handler(
  async () => {
    const teacher = await requireTeacher(getRequestHeaders());
    const rows = await database()
      .select()
      .from(quizTable)
      .where(eq(quizTable.ownerId, teacher.id))
      .orderBy(desc(quizTable.updatedAt));
    return [
      ...rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        cover: row.cover,
        questions: row.questions,
        updatedAt: row.updatedAt.toISOString(),
        isExample: false,
      })),
      ...sampleQuizzes,
    ];
  },
);
export const persistQuiz = createServerFn({ method: "POST" })
  .validator(prepareQuizForStorage)
  .handler(async ({ data }) => {
    const teacher = await requireTeacher(getRequestHeaders());
    const now = new Date();
    const values = {
      id: data.id,
      ownerId: teacher.id,
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
        setWhere: eq(quizTable.ownerId, teacher.id),
      })
      .returning({ id: quizTable.id });
    if (!rows.length)
      throw new Error("This quiz could not be saved to your account.");
    return { ...data, updatedAt: now.toISOString(), isExample: false };
  });
export const removeQuiz = createServerFn({ method: "POST" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || id.length > 100)
      throw new Error("Invalid quiz identifier.");
    return id;
  })
  .handler(async ({ data }) => {
    const teacher = await requireTeacher(getRequestHeaders());
    await database()
      .delete(quizTable)
      .where(and(eq(quizTable.id, data), eq(quizTable.ownerId, teacher.id)));
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
    const teacher = await requireTeacher(getRequestHeaders());
    const now = new Date();
    const db = database();
    const statements = data.map((quiz) =>
      db
        .insert(quizTable)
        .values({
          id: quiz.id,
          ownerId: teacher.id,
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
