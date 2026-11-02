export const workspaceRoles = ["owner", "admin", "teacher"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];
export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return workspaceRoles.some((role) => role === value);
}
export function canManageMembers(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}
export function canViewReport(
  role: string | null | undefined,
  actorId: string,
  hostId: string,
) {
  return (
    isWorkspaceRole(role) && (actorId === hostId || canManageMembers(role))
  );
}
export function canReadWorkspaceQuiz(
  actorId: string,
  quiz: { ownerId: string; visibility: string },
) {
  return actorId === quiz.ownerId || quiz.visibility === "workspace";
}
