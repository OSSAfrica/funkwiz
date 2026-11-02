export const emailProviders = ["resend", "cloudflare", "smtp"] as const;
export type EmailProvider = (typeof emailProviders)[number];
export type EmailProviderSettings = {
  BETTER_AUTH_URL?: string;
  AUTH_EMAIL_PROVIDER?: string;
  AUTH_EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  EMAIL?: SendEmail;
  CLOUDFLARE_EMAIL_REMOTE?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
};
export function isEmailProvider(value: unknown): value is EmailProvider {
  return (
    typeof value === "string" &&
    emailProviders.some((provider) => provider === value)
  );
}
export function defaultEmailProvider(
  settings: EmailProviderSettings,
): EmailProvider | null {
  const provider = settings.AUTH_EMAIL_PROVIDER?.trim() || "resend";
  return isEmailProvider(provider) ? provider : null;
}
export function smtpOptions(settings: EmailProviderSettings) {
  const host = settings.SMTP_HOST?.trim(),
    user = settings.SMTP_USER?.trim();
  const port = Number(settings.SMTP_PORT?.trim() || "587");
  const secure =
    settings.SMTP_SECURE?.trim().toLowerCase() || String(port === 465);
  if (
    !host ||
    !/^[a-zA-Z0-9.-]+$/.test(host) ||
    !user ||
    !settings.SMTP_PASSWORD ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    port === 25 ||
    !["true", "false"].includes(secure)
  )
    return null;
  return {
    host,
    port,
    secure: secure === "true",
    requireTLS: true,
    auth: { user, pass: settings.SMTP_PASSWORD },
    tls: { minVersion: "TLSv1.2" as const },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    logger: false as const,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
export function emailSender(settings: EmailProviderSettings) {
  const sender = settings.AUTH_EMAIL_FROM?.trim() ?? "";
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(sender) ? sender : null;
}
export function emailConfigured(
  settings: EmailProviderSettings,
  provider = defaultEmailProvider(settings),
) {
  if (!emailSender(settings)) return false;
  switch (provider) {
    case "resend":
      return Boolean(settings.RESEND_API_KEY?.trim());
    case "smtp":
      return Boolean(smtpOptions(settings));
    case "cloudflare": {
      if (typeof settings.EMAIL?.send !== "function") return false;
      try {
        const local = ["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(settings.BETTER_AUTH_URL ?? "").hostname,
        );
        // The default local binding simulates delivery and must not claim mail was sent.
        return !local || settings.CLOUDFLARE_EMAIL_REMOTE === "true";
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}
