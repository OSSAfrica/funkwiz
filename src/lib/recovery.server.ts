import { randomBytes } from "node:crypto";
import {
  createAuthEndpoint,
  formCsrfMiddleware,
  resetPassword,
} from "better-auth/api";
import { z } from "zod";
import {
  isTeacher,
  teacherEmail,
  resetEmailConfigured,
  type AuthSettings,
} from "./auth-policy";
import { sendResetEmail } from "./auth-email.server";
import { schoolEmailAllowed } from "./school-access.server";
import { selectedEmailProvider } from "./email-settings.server";
import { setupCodeMatches } from "./setup-code.server";

export function teacherRecovery(settings: AuthSettings) {
  return {
    id: "teacher-recovery",
    endpoints: {
      requestTeacherPasswordReset: createAuthEndpoint(
        "/request-teacher-password-reset",
        {
          method: "POST",
          use: [formCsrfMiddleware],
          metadata: { noStore: true },
          body: z.object({ email: z.email().max(254) }),
        },
        async (ctx) => {
          const provider = await selectedEmailProvider(settings);
          if (!resetEmailConfigured(settings, provider))
            return Response.json(
              {
                message:
                  "Email recovery is not configured. Use your private setup code.",
              },
              { status: 503 },
            );
          const accepted = () => ctx.json({ status: true });
          if (!(await schoolEmailAllowed(ctx.body.email, settings)))
            return accepted();
          const owner = await ctx.context.internalAdapter.findUserByEmail(
            ctx.body.email.trim().toLowerCase(),
          );
          if (!owner) return accepted();
          const token = randomBytes(32).toString("base64url");
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `reset-password:${token}`,
            value: owner.user.id,
            expiresAt: new Date(Date.now() + 30 * 60_000),
          });
          const callback = `${new URL(settings.BETTER_AUTH_URL!).origin}/reset-password`;
          const url = `${callback}?token=${token}`;
          try {
            await sendResetEmail(
              settings,
              owner.user.email,
              url,
              token,
              provider,
            );
          } catch {
            return Response.json(
              {
                message:
                  "The reset email could not be sent. Try again later or use your private setup code.",
              },
              { status: 503 },
            );
          }
          return accepted();
        },
      ),
      resetWithSetupCode: createAuthEndpoint(
        "/reset-with-setup-code",
        {
          method: "POST",
          use: [formCsrfMiddleware],
          metadata: { noStore: true },
          body: z.object({
            email: z.email().max(254),
            setupCode: z.string().max(256),
            newPassword: z.string().min(12).max(128),
          }),
        },
        async (ctx) => {
          const valid = setupCodeMatches(
            ctx.body.setupCode,
            settings.TEACHER_SETUP_TOKEN ?? "",
          );
          const denied = () =>
            Response.json(
              {
                message:
                  "The email or private setup code could not be verified.",
              },
              { status: 400 },
            );
          if (!valid || !isTeacher(ctx.body.email, settings)) return denied();
          const owner = await ctx.context.internalAdapter.findUserByEmail(
            teacherEmail(settings),
          );
          if (!owner) return denied();
          // Reuse Better Auth's single-use reset and session-revocation path.
          const token = randomBytes(32).toString("base64url");
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `reset-password:${token}`,
            value: owner.user.id,
            expiresAt: new Date(Date.now() + 5 * 60_000),
          });
          return resetPassword({
            ...ctx,
            body: { token, newPassword: ctx.body.newPassword },
          });
        },
      ),
    },
  };
}
