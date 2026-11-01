import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { account, user } from "@/db/schema";
import { authConfigured, googleProvider, teacherEmail } from "./auth-policy";
import {
  createAuth,
  database,
  getTeacherSession,
  requireTeacher,
} from "./auth.server";

export const getTeacher = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getTeacherSession(getRequestHeaders());
    return session
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }
      : null;
  },
);
export const getLoginOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!authConfigured(env))
      return {
        configured: false,
        googleEnabled: false,
        registrationOpen: false,
      };
    const existing = await database()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, teacherEmail(env)))
      .get();
    return {
      configured: true,
      googleEnabled: Boolean(googleProvider(env)),
      registrationOpen:
        !existing && (env.TEACHER_SETUP_TOKEN?.length ?? 0) >= 32,
    };
  },
);
export const getPasswordStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const teacher = await requireTeacher(getRequestHeaders());
    const accounts = await database()
      .select({ provider: account.providerId, password: account.password })
      .from(account)
      .where(eq(account.userId, teacher.id));
    return {
      hasPassword: accounts.some(
        (account) =>
          account.provider === "credential" && Boolean(account.password),
      ),
    };
  },
);
export const addPassword = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (
      !value ||
      typeof value !== "object" ||
      !("password" in value) ||
      typeof value.password !== "string" ||
      value.password.length < 12 ||
      value.password.length > 128
    )
      throw new Error("Choose a password with 12–128 characters.");
    return { password: value.password };
  })
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    await requireTeacher(headers);
    await createAuth().api.setPassword({
      headers,
      body: { newPassword: data.password },
    });
    return { success: true };
  });
