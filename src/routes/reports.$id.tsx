import { socialHead } from "@/lib/social";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getTeacher } from "@/lib/auth.functions";
import { readGameReport } from "@/lib/live/reports.functions";
import { GameReportScreen } from "@/components/live/game-report";
export const Route = createFileRoute("/reports/$id")({
  beforeLoad: async () => {
    if (!(await getTeacher())) throw redirect({ to: "/login", search: {} });
  },
  loader: ({ params }) => readGameReport({ data: params.id }),
  head: ({ match }) => socialHead("report", match.context.siteOrigin),
  component: Report,
});
function Report() {
  return <GameReportScreen report={Route.useLoaderData()} />;
}
