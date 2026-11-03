import { emailConfigured, type EmailProviderSettings } from "./email-provider";
import { classroomOrigin, type ClassroomSettings } from "./classroom-policy";
/** Server configuration only. Never return this object to a browser. */
export type AuthSettings = EmailProviderSettings &
  ClassroomSettings & {
    FUNKWIZ_MODE?: string;
    DB?: D1Database;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_SECRET?: string;
    TEACHER_EMAIL?: string;
    TEACHER_SETUP_TOKEN?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
  };
export function schoolMode(settings: AuthSettings) {
  return settings.FUNKWIZ_MODE === "school";
}
export function teacherEmail(settings: AuthSettings) {
  return settings.TEACHER_EMAIL?.trim().toLowerCase() ?? "";
}
export function isTeacher(email: string | undefined, settings: AuthSettings) {
  const allowed = teacherEmail(settings);
  return Boolean(allowed && email?.trim().toLowerCase() === allowed);
}
export function googleProvider(settings: AuthSettings) {
  if (settings.FUNKWIZ_LOCAL_CLASSROOM === "true") return undefined;
  const clientId = settings.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = settings.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret
    ? { clientId, clientSecret, prompt: "select_account" as const }
    : undefined;
}
export function authConfigured(settings: AuthSettings) {
  if (
    !teacherEmail(settings) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail(settings))
  )
    return false;
  if ((settings.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) return false;
  if (settings.FUNKWIZ_LOCAL_CLASSROOM === "true")
    return Boolean(classroomOrigin(settings));
  try {
    const url = new URL(settings.BETTER_AUTH_URL ?? "");
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}
export function trustedOrigins(settings: AuthSettings) {
  const url = new URL(settings.BETTER_AUTH_URL!);
  const origins = [url.origin];
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    url.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
    origins.push(url.origin);
  }
  return origins;
}

export const resetEmailConfigured = emailConfigured;
