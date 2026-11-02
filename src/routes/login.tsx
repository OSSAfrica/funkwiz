import { socialHead } from "@/lib/social";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getLoginOptions, getTeacher } from "@/lib/auth.functions";
import { SignInScreen } from "@/components/auth/sign-in-screen";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: search.error ? "google" : undefined,
  }),
  beforeLoad: async () => {
    if (await getTeacher()) throw redirect({ to: "/" });
  },
  loader: () => getLoginOptions(),
  head: ({ match }) => socialHead("teacher", match.context.siteOrigin),
  component: Login,
});
function Login() {
  const options = Route.useLoaderData();
  const { error } = Route.useSearch();
  return <SignInScreen options={options} oauthError={Boolean(error)} />;
}
