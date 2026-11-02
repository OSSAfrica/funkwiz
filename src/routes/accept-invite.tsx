import { createFileRoute } from "@tanstack/react-router";
import { getTeacher, getLoginOptions } from "@/lib/auth.functions";
import { getWorkspaceInvitation } from "@/lib/workspaces.functions";
import { WorkspaceInvitationScreen } from "@/components/workspaces/invitation-screen";
import { socialHead } from "@/lib/social";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token:
      typeof search.token === "string" && search.token.length <= 100
        ? search.token
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    const [invitation, teacher, options] = await Promise.all([
      getWorkspaceInvitation({ data: deps.token ?? "" }),
      getTeacher(),
      getLoginOptions(),
    ]);
    return { invitation, teacher, googleEnabled: options.googleEnabled };
  },
  head: ({ match }) => {
    const head = socialHead("teacher", match.context.siteOrigin);
    return {
      ...head,
      meta: [...head.meta, { name: "referrer", content: "no-referrer" }],
    };
  },
  headers: () => ({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  }),
  component: Invitation,
});
function Invitation() {
  const data = Route.useLoaderData();
  return (
    <WorkspaceInvitationScreen
      {...data}
      token={Route.useSearch().token ?? ""}
    />
  );
}
