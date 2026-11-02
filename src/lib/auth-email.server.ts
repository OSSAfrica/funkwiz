import { createHash } from "node:crypto";
import { APIError } from "better-auth/api";
import { isTeacher, type AuthSettings } from "./auth-policy";

export async function sendResetEmail(
  settings: AuthSettings,
  email: string,
  url: string,
  token: string,
) {
  if (!isTeacher(email, settings)) return;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `fun-quiz-reset/${createHash("sha256").update(token).digest("hex")}`,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: settings.AUTH_EMAIL_FROM!.trim(),
        to: [email],
        subject: "Reset your Fun Quiz password",
        text: `Back to the good questions.\n\nReset your Fun Quiz password:\n${url}\n\nThis link expires in 30 minutes and can be used once. A password reset signs out your existing teacher sessions.\n\nIf you did not request this, you can ignore this email.`,
      }),
    });
    if (!response.ok) throw new Error("Delivery rejected");
  } catch {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message:
        "The reset email could not be sent. Try again later or use your private setup code.",
    });
  }
}
