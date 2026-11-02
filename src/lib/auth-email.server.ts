import { renderAccountEmail, type AccountEmail } from "@/emails/render.server";
import { createHash } from "node:crypto";
import { APIError } from "better-auth/api";
import { isTeacher, type AuthSettings } from "./auth-policy";
import {
  emailConfigured,
  smtpOptions,
  type EmailProvider,
} from "./email-provider";
import { selectedEmailProvider } from "./email-settings.server";

export async function sendResetEmail(
  settings: AuthSettings,
  email: string,
  url: string,
  token: string,
  provider?: EmailProvider | null,
) {
  if (!isTeacher(email, settings)) return;
  const selected =
    provider === undefined ? await selectedEmailProvider(settings) : provider;
  try {
    if (!emailConfigured(settings, selected))
      throw new Error("Email provider is not configured");
    const target = new URL(url);
    if (
      target.origin !== new URL(settings.BETTER_AUTH_URL!).origin ||
      target.pathname !== "/reset-password"
    )
      throw new Error("Invalid reset destination");
    const content = await renderAccountEmail({
      kind: "password-reset",
      resetUrl: target.href,
    });
    await deliverEmail(settings, email, content, selected, token);
  } catch {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message:
        "The reset email could not be sent. Try again later or use your private setup code.",
    });
  }
}

async function deliverEmail(
  settings: AuthSettings,
  email: string,
  content: Awaited<ReturnType<typeof renderAccountEmail>>,
  selected: EmailProvider | null,
  idempotency: string,
) {
  const message = {
    from: settings.AUTH_EMAIL_FROM!.trim(),
    to: [email],
    ...content,
  };
  switch (selected) {
    case "resend": {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.RESEND_API_KEY!.trim()}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `fun-quiz-reset/${createHash("sha256").update(idempotency).digest("hex")}`,
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify(message),
      });
      if (!response.ok) throw new Error("Delivery rejected");
      break;
    }
    case "cloudflare":
      await settings.EMAIL!.send(message);
      break;
    case "smtp": {
      const { createTransport } = await import("nodemailer");
      const transport = createTransport(smtpOptions(settings)!);
      try {
        const result = await transport.sendMail(message);
        if (!result.accepted?.length || result.rejected?.length)
          throw new Error("Delivery rejected");
      } finally {
        transport.close();
      }
      break;
    }
    default:
      throw new Error("Choose an email provider");
  }
}
// Account changes must succeed even if a notification provider is unavailable.
// Never include passwords, setup codes, reset tokens, or provider errors in logs.
export async function sendAccountNotification(
  settings: AuthSettings,
  recipient: { email: string; name?: string },
  kind: "welcome" | "password-changed",
) {
  if (!isTeacher(recipient.email, settings)) return;
  try {
    const provider = await selectedEmailProvider(settings);
    if (!emailConfigured(settings, provider)) return;
    const origin = new URL(settings.BETTER_AUTH_URL!).origin;
    const notification: AccountEmail =
      kind === "welcome"
        ? { kind, name: recipient.name || "teacher", workspaceUrl: origin }
        : { kind, recoveryUrl: `${origin}/forgot-password` };
    const content = await renderAccountEmail(notification);
    await deliverEmail(
      settings,
      recipient.email,
      content,
      provider,
      `${kind}:${crypto.randomUUID()}`,
    );
  } catch {
    console.warn("Funkwiz account notification could not be delivered.");
  }
}
