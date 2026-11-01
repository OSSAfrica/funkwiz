import { Link } from "@tanstack/react-router";
import { ArrowRight, Radio, Trophy } from "lucide-react";
import type { listLiveSessions } from "@/lib/live/reports.functions";
export function RecentGames({
  sessions,
}: {
  sessions: Awaited<ReturnType<typeof listLiveSessions>>;
}) {
  if (!sessions.length) return null;
  return (
    <section className="recent-games">
      <div className="live-section-heading">
        <span className="eyebrow">KEEP THE GOOD QUESTIONS GOING</span>
        <h2>Your recent games</h2>
      </div>
      <div className="recent-game-list">
        {sessions.map((session) => {
          const ended =
            session.status === "finished" || session.status === "closed";
          return (
            <article key={session.id}>
              <span className={ended ? "recent-finished" : "recent-active"}>
                {ended ? <Trophy size={21} /> : <Radio size={21} />}
              </span>
              <div>
                <h3>{session.title}</h3>
                <p>
                  Game {session.code} ·{" "}
                  {ended
                    ? session.status === "closed"
                      ? "Closed"
                      : "Finished"
                    : session.expired
                      ? "Expired"
                      : "Lobby open / in progress"}
                </p>
              </div>
              {ended ? (
                <Link to="/reports/$id" params={{ id: session.id }}>
                  View report
                  <ArrowRight size={15} />
                </Link>
              ) : !session.expired ? (
                <Link to="/host/$code" params={{ code: session.code }}>
                  Resume hosting
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Start a fresh game
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
