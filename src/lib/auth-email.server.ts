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
    const href = target.href.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]!,
    );
    const message = {
      from: settings.AUTH_EMAIL_FROM!.trim(),
      to: [email],
      subject: "Reset your Fun Quiz password",
      html: `<div style="font-family:Arial,sans-serif;color:#173e35;max-width:520px;margin:auto;padding:28px"><p style="font-size:22px;font-weight:bold">funquiz.</p><h1>Back to the good questions.</h1><p>Choose a fresh password and get back to your classroom.</p><p style="margin:28px 0"><a href="${href}" style="background:#f9dc80;color:#173e35;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:bold">Reset my password</a></p><p>This link expires in 30 minutes and works once. Resetting signs out existing teacher sessions.</p><p>If you didn’t request this, you can ignore this email.</p></div>`,
      text: `Back to the good questions.\n\nReset your Fun Quiz password:\n${url}\n\nThis link expires in 30 minutes and can be used once. A password reset signs out your existing teacher sessions.\n\nIf you did not request this, you can ignore this email.`,
    };
    switch (selected) {
      case "resend": {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.RESEND_API_KEY!.trim()}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `fun-quiz-reset/${createHash("sha256").update(token).digest("hex")}`,
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
  } catch {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message:
        "The reset email could not be sent. Try again later or use your private setup code.",
    });
  }
}
