import { authClient } from "./auth-client";

export async function signOutTeacher() {
  const result = await authClient.signOut();
  if (result.error) throw new Error("Sign out failed");
  // A full navigation discards cached teacher pages and in-memory account data.
  window.location.replace("/login");
}
