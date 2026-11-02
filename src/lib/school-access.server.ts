import { createHash } from "node:crypto";
import { isTeacher, schoolMode, type AuthSettings } from "./auth-policy";

export const invitationHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function schoolEmailAllowed(
  email: string,
  settings: AuthSettings,
  includeInvited = true,
) {
  if (isTeacher(email, settings)) return true;
  if (!schoolMode(settings) || !settings.DB) return false;
  const normalized = email.trim().toLowerCase();
  const membership = await settings.DB.prepare(
    "SELECT m.id FROM member m JOIN user u ON u.id = m.user_id WHERE u.email = ? AND m.role IN ('owner','admin','teacher') LIMIT 1",
  )
    .bind(normalized)
    .first();
  if (membership) return true;
  return (
    includeInvited &&
    Boolean(
      await settings.DB.prepare(
        "SELECT id FROM invitation WHERE email = ? AND status = 'pending' AND expires_at > ? LIMIT 1",
      )
        .bind(normalized, Date.now())
        .first(),
    )
  );
}
export async function registrationInvite(
  proof: string,
  email: string,
  settings: AuthSettings,
) {
  if (
    !schoolMode(settings) ||
    !settings.DB ||
    !/^[A-Za-z0-9_-]{43}$/.test(proof)
  )
    return null;
  return settings.DB.prepare(
    "SELECT i.id, i.organization_id AS workspaceId FROM invitation i JOIN workspace_invite_proof p ON p.invitation_id = i.id WHERE p.token_hash = ? AND i.email = ? AND i.status = 'pending' AND i.expires_at > ?",
  )
    .bind(invitationHash(proof), email.trim().toLowerCase(), Date.now())
    .first<{ id: string; workspaceId: string }>();
}
