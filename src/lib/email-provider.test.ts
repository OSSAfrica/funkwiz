import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultEmailProvider,
  emailConfigured,
  smtpOptions,
} from "./email-provider";
const smtp = {
  AUTH_EMAIL_FROM: "quiz@example.test",
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "mailer",
  SMTP_PASSWORD: "fake-password",
};

test("provider selection is explicit and never silently falls back", () => {
  assert.equal(defaultEmailProvider({}), "resend");
  assert.equal(
    defaultEmailProvider({ AUTH_EMAIL_PROVIDER: "cloudflare" }),
    "cloudflare",
  );
  assert.equal(defaultEmailProvider({ AUTH_EMAIL_PROVIDER: "unknown" }), null);
  assert.equal(
    emailConfigured({
      AUTH_EMAIL_PROVIDER: "smtp",
      AUTH_EMAIL_FROM: "quiz@example.test",
      RESEND_API_KEY: "key",
    }),
    false,
  );
});
test("SMTP requires authenticated TLS and rejects unsupported or invalid settings", () => {
  const starttls = smtpOptions(smtp)!;
  assert.equal(starttls.port, 587);
  assert.equal(starttls.secure, false);
  assert.equal(starttls.requireTLS, true);
  assert.equal(starttls.tls.minVersion, "TLSv1.2");
  assert.equal(smtpOptions({ ...smtp, SMTP_PORT: "465" })?.secure, true);
  assert.equal(smtpOptions({ ...smtp, SMTP_PORT: "2525" })?.requireTLS, true);
  for (const config of [
    { ...smtp, SMTP_HOST: "" },
    { ...smtp, SMTP_USER: "" },
    { ...smtp, SMTP_PASSWORD: "" },
    { ...smtp, SMTP_PORT: "25" },
    { ...smtp, SMTP_PORT: "65536" },
    { ...smtp, SMTP_PORT: "invalid" },
    { ...smtp, SMTP_SECURE: "maybe" },
  ])
    assert.equal(smtpOptions(config), null);
  assert.equal(emailConfigured(smtp, "smtp"), true);
});
test("local Cloudflare simulation is not advertised as live delivery", () => {
  const config = {
    BETTER_AUTH_URL: "http://localhost:3000",
    AUTH_EMAIL_FROM: "quiz@example.test",
    EMAIL: { send: async () => ({ messageId: "fake-id" }) },
  };
  assert.equal(emailConfigured(config, "cloudflare"), false);
  assert.equal(
    emailConfigured(
      { ...config, CLOUDFLARE_EMAIL_REMOTE: "true" },
      "cloudflare",
    ),
    true,
  );
  assert.equal(
    emailConfigured(
      { ...config, BETTER_AUTH_URL: "https://quiz.example.test" },
      "cloudflare",
    ),
    true,
  );
  assert.equal(
    emailConfigured({ ...config, EMAIL: undefined }, "cloudflare"),
    false,
  );
});
