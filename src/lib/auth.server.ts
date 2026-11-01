import { env } from "cloudflare:workers";
import { createHash, timingSafeEqual } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  authConfigured,
  googleProvider,
  isTeacher,
  teacherEmail,
  trustedOrigins,
} from "./auth-policy";

export function database() {
  return drizzle(env.DB, { schema });
}
export function createAuth(useStartCookies = true) {
  if (!authConfigured(env))
    throw new Error("Teacher sign-in is not configured.");
  const db = database();
  const google = googleProvider(env);
  return betterAuth({
    appName: "Fun Quiz",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      transaction: false,
    }),
    trustedOrigins: trustedOrigins(env),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    socialProviders: google ? { google } : {},
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 120,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email") {
          if (!isTeacher(ctx.body?.email, env))
            throw new APIError("FORBIDDEN", {
              message: "This workspace is reserved for its teacher.",
            });
        }
        if (ctx.path === "/sign-up/email") {
          const provided = ctx.headers?.get("x-teacher-setup-code") ?? "";
          const expected = env.TEACHER_SETUP_TOKEN ?? "";
          const valid =
            expected.length >= 32 &&
            timingSafeEqual(
              createHash("sha256").update(provided).digest(),
              createHash("sha256").update(expected).digest(),
            );
          if (!valid)
            throw new APIError("FORBIDDEN", {
              message:
                "Enter the private teacher setup code to create your account.",
            });
          const existing = await db
            .select({ id: schema.user.id })
            .from(schema.user)
            .where(eq(schema.user.email, teacherEmail(env)))
            .get();
          if (existing)
            throw new APIError("FORBIDDEN", {
              message: "The teacher account is already set up. Please sign in.",
            });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            if (!isTeacher(user.email, env))
              throw new APIError("FORBIDDEN", {
                message: "This workspace is reserved for its teacher.",
              });
            if (ctx?.path !== "/sign-up/email" && !user.emailVerified)
              throw new APIError("FORBIDDEN", {
                message: "Use your verified teacher Google account.",
              });
            return { data: { ...user, email: teacherEmail(env) } };
          },
        },
        update: {
          before: async (user) => {
            if (user.email && !isTeacher(user.email, env))
              throw new APIError("FORBIDDEN", {
                message: "The teacher email cannot be changed here.",
              });
            return { data: user };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const owner = await db
              .select({ email: schema.user.email })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .get();
            if (!isTeacher(owner?.email, env))
              throw new APIError("FORBIDDEN", {
                message: "Teacher access is required.",
              });
            return { data: session };
          },
        },
      },
    },
    plugins: useStartCookies ? [tanstackStartCookies()] : [],
  });
}
export async function getTeacherSession(headers: Headers, useStartCookies = true) {
  if (!authConfigured(env)) return null;
  const session = await createAuth(useStartCookies).api.getSession({ headers });
  return session && isTeacher(session.user.email, env) ? session : null;
}
export async function requireTeacher(headers: Headers) {
  const session = await getTeacherSession(headers);
  if (!session)
    throw new Error("Your session has ended. Sign in again to continue.");
  return session.user;
}
