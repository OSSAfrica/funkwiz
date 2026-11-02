import {
  defaultEmailProvider,
  emailConfigured,
  emailSender,
  isEmailProvider,
} from "./email-provider";
import { teacherEmail, type AuthSettings } from "./auth-policy";

export async function selectedEmailProvider(settings: AuthSettings) {
  if (settings.DB) {
    const saved = await settings.DB.prepare(
      "SELECT s.provider FROM email_delivery_settings s JOIN user u ON u.id = s.owner_id WHERE u.email = ? LIMIT 1",
    )
      .bind(teacherEmail(settings))
      .first<{ provider: string }>();
    if (saved && isEmailProvider(saved.provider)) return saved.provider;
  }
  return defaultEmailProvider(settings);
}
export async function emailDeliveryOptions(settings: AuthSettings) {
  const provider = await selectedEmailProvider(settings);
  return {
    provider,
    sender: emailSender(settings),
    options: [
      {
        id: "resend" as const,
        label: "Resend",
        configured: emailConfigured(settings, "resend"),
      },
      {
        id: "cloudflare" as const,
        label: "Cloudflare Email",
        configured: emailConfigured(settings, "cloudflare"),
      },
      {
        id: "smtp" as const,
        label: "Other SMTP service",
        configured: emailConfigured(settings, "smtp"),
      },
    ],
  };
}
