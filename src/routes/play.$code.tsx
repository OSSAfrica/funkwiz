import { socialHead } from "@/lib/social";
import { createFileRoute } from "@tanstack/react-router";
import { StudentGame } from "@/components/live/student-game";
export const Route = createFileRoute("/play/$code")({
  head: ({ match, params }) =>
    socialHead("play", match.context.siteOrigin, { code: params.code }),
  component: Play,
});
function Play() {
  return (
    <StudentGame key={Route.useParams().code} code={Route.useParams().code} />
  );
}
