import { createFileRoute, redirect } from "@tanstack/react-router";
import { getTeacher } from "@/lib/auth.functions";
import { HostGame } from "@/components/live/host-game";
export const Route = createFileRoute("/host/$code")({
  beforeLoad: async () => {
    if (!(await getTeacher())) throw redirect({ to: "/login", search: {} });
  },
  component: Host,
});
function Host() {
  return (
    <HostGame key={Route.useParams().code} code={Route.useParams().code} />
  );
}
