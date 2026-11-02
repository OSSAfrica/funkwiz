import { sendAccountNotification } from "./auth-email.server";
import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import {
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";
import { registrationInvite, schoolEmailAllowed } from "./school-access.server";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import { and, eq, like } from "drizzle-orm";
import { teacherRecovery } from "./recovery.server";
import { setupCodeMatches } from "./setup-code.server";
import * as schema from "@/db/schema";
import {
  authConfigured,
  googleProvider,
  isTeacher,
  schoolMode,
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
  const school = schoolMode(env);
  const workspaces = organization({
    roles: { owner: ownerAc, admin: adminAc, teacher: memberAc },
    creatorRole: "owner",
    disableOrganizationDeletion: true,
    invitationExpiresIn: 48 * 60 * 60,
    allowUserToCreateOrganization: async (user) =>
      school &&
      (isTeacher(user.email, env) ||
        Boolean(
          await db
            .select({ id: schema.member.id })
            .from(schema.member)
            .where(
              and(
                eq(schema.member.userId, user.id),
                eq(schema.member.role, "owner"),
              ),
            )
            .get(),
        )),
  });
  return betterAuth({
    appName: "Funkwiz",
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
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 30 * 60,
      onPasswordReset: async ({ user }) => {
        await db
          .delete(schema.verification)
          .where(
            and(
              eq(schema.verification.value, user.id),
              like(schema.verification.identifier, "reset-password:%"),
            ),
          );
      },
    },
    // Workspace operations are exposed only through our scoped server functions.
    disabledPaths: [
      "/request-password-reset",
      ...Object.values(workspaces.endpoints).map((endpoint) => endpoint.path),
    ],
    socialProviders: google ? { google } : {},
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: {
      disableOriginCheck: false,
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 120,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/reset-with-setup-code": { window: 60, max: 5 },
        "/request-teacher-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const recovered =
          ctx.path === "/reset-password" ||
          ctx.path === "/reset-with-setup-code";
        if (ctx.path !== "/change-password" && !recovered) return;
        const result = ctx.context.returned;
        if (
          !result ||
          result instanceof APIError ||
          (result instanceof Response && !result.ok)
        )
          return;
        if (recovered) {
          // Run after proof invalidation and session revocation have completed.
          await sendAccountNotification(
            env,
            {
              email:
                (ctx.context as { recoveryEmail?: string }).recoveryEmail ||
                teacherEmail(env),
            },
            "password-changed",
          );
        } else if (ctx.context.session?.user)
          await sendAccountNotification(
            env,
            ctx.context.session.user,
            "password-changed",
          );
      }),
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path.startsWith("/organization/") && !school)
          throw new APIError("FORBIDDEN", {
            message: "School mode is not enabled.",
          });
        if (
          ctx.path === "/reset-password" &&
          typeof ctx.body?.token === "string"
        ) {
          const proof = await db
            .select({ userId: schema.verification.value })
            .from(schema.verification)
            .where(
              eq(
                schema.verification.identifier,
                `reset-password:${ctx.body.token}`,
              ),
            )
            .get();
          if (proof) {
            const recovering = await db
              .select({ email: schema.user.email })
              .from(schema.user)
              .where(eq(schema.user.id, proof.userId))
              .get();
            if (recovering)
              (ctx.context as { recoveryEmail?: string }).recoveryEmail =
                recovering.email;
          }
        }
        if (ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email") {
          if (
            !isTeacher(ctx.body?.email, env) &&
            !(
              school &&
              typeof ctx.body?.email === "string" &&
              (await schoolEmailAllowed(ctx.body.email, env))
            )
          )
            throw new APIError("FORBIDDEN", {
              message: "This workspace is reserved for its teacher.",
            });
        }
        if (ctx.path === "/sign-up/email" && !isTeacher(ctx.body?.email, env)) {
          if (
            !(await registrationInvite(
              ctx.headers?.get("x-workspace-invitation") ?? "",
              ctx.body?.email ?? "",
              env,
            ))
          )
            throw new APIError("FORBIDDEN", {
              message:
                "Use your private workspace invitation to create an account.",
            });
        }
        if (ctx.path === "/sign-up/email" && isTeacher(ctx.body?.email, env)) {
          const provided = ctx.headers?.get("x-teacher-setup-code") ?? "";
          const expected = env.TEACHER_SETUP_TOKEN ?? "";
          const valid = setupCodeMatches(provided, expected);
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
            if (
              !isTeacher(user.email, env) &&
              !(school && (await schoolEmailAllowed(user.email, env)))
            )
              throw new APIError("FORBIDDEN", {
                message: "This workspace is reserved for its teacher.",
              });
            if (ctx?.path !== "/sign-up/email" && !user.emailVerified)
              throw new APIError("FORBIDDEN", {
                message: "Use your verified teacher Google account.",
              });
            if (
              school &&
              ctx?.path === "/sign-up/email" &&
              !isTeacher(user.email, env) &&
              !(await registrationInvite(
                ctx.headers?.get("x-workspace-invitation") ?? "",
                user.email,
                env,
              ))
            )
              throw new APIError("FORBIDDEN", {
                message: "A valid invitation is required.",
              });
            return {
              data: { ...user, email: user.email.trim().toLowerCase() },
            };
          },
          after: async (user) => {
            await sendAccountNotification(env, user, "welcome");
          },
        },
        update: {
          before: async (user) => {
            if (
              user.email &&
              !isTeacher(user.email, env) &&
              !(school && (await schoolEmailAllowed(user.email, env)))
            )
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
            if (!owner || !(await schoolEmailAllowed(owner.email, env)))
              throw new APIError("FORBIDDEN", {
                message: "Teacher access is required.",
              });
            return { data: session };
          },
        },
      },
    },
    plugins: [
      teacherRecovery(env),
      workspaces,
      ...(useStartCookies ? [tanstackStartCookies()] : []),
    ],
  });
}
export async function getTeacherSession(
  headers: Headers,
  useStartCookies = true,
) {
  if (!authConfigured(env)) return null;
  const session = await createAuth(useStartCookies).api.getSession({ headers });
  return session && (await schoolEmailAllowed(session.user.email, env))
    ? session
    : null;
}
export async function requireTeacher(headers: Headers) {
  const session = await getTeacherSession(headers);
  if (!session)
    throw new Error("Your session has ended. Sign in again to continue.");
  return session.user;
}
