import { socialHead } from "@/lib/social";
import { createFileRoute } from "@tanstack/react-router";
import { JoinGame } from "@/components/live/join-game";
export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => {
    const candidate =
      typeof search.code === "string" || typeof search.code === "number"
        ? String(search.code)
        : "";
    return { code: /^\d{6}$/.test(candidate) ? candidate : undefined };
  },
  head: ({ match }) =>
    socialHead("join", match.context.siteOrigin, { code: match.search.code }),
  component: Join,
});
function Join() {
  return (
    <JoinGame
      key={Route.useSearch().code}
      initialCode={Route.useSearch().code ?? ""}
    />
  );
}
