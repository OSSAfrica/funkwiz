import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordScreen } from "@/components/auth/password-recovery";
export const Route = createFileRoute("/reset-password")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string; error?: boolean } => ({
    token:
      typeof search.token === "string" &&
      /^[a-zA-Z0-9_-]{16,256}$/.test(search.token)
        ? search.token
        : undefined,
    error: search.error ? true : undefined,
  }),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  headers: () => ({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  }),
  component: ResetPasswordRoute,
});
function ResetPasswordRoute() {
  const { token, error } = Route.useSearch();
  return <ResetPasswordScreen token={token} invalid={Boolean(error)} />;
}
