import { createFileRoute } from "@tanstack/react-router";
import { PasswordRecovery } from "@/components/auth/password-recovery";
import { getRecoveryOptions } from "@/lib/auth.functions";
export const Route = createFileRoute("/forgot-password")({
  loader: () => getRecoveryOptions(),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  headers: () => ({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  }),
  component: ForgotPasswordRoute,
});

function ForgotPasswordRoute() {
  const options = Route.useLoaderData();
  return <PasswordRecovery options={options} />;
}
