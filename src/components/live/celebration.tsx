import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Crown, Sparkles, Trophy } from "lucide-react";
import type { RoomView } from "@/lib/live/protocol";

// One short celebration per result, per browser tab. A reconnect never restarts it.
function useCelebration(key: string) {
  const checked = useRef("");
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (checked.current === key) return;
    checked.current = key;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "seen");
    } catch {
      /* A blocked session store still gets one animation per mount. */
    }
    setPlaying(true);
  }, [key]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), 4800);
    return () => clearTimeout(timer);
  }, [playing]);
  return [playing, () => setPlaying(false)] as const;
}

export function Confetti({ playing }: { playing: boolean }) {
  return (
    <div
      className="celebration-confetti"
      aria-hidden="true"
      data-playing={playing}
    >
      {Array.from({ length: 32 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 37) % 100}%`,
              backgroundColor: ["#f9dc80", "#c5b2ef", "#c7dfb0", "#f49d79"][
                i % 4
              ],
              animationDelay: `${(i % 7) * 0.1}s`,
              "--drift": `${((i * 29) % 160) - 80}px`,
              "--spin": `${i % 2 ? 280 : -240}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function PlayerCelebration({
  sessionId,
  rank,
}: {
  sessionId: string;
  rank: number;
}) {
  const [playing] = useCelebration(`funkwiz:celebration:player:${sessionId}`);
  if (rank < 1 || rank > 3) return null;
  return (
    <>
      <Confetti playing={playing} />
      <p className="player-podium-badge">
        <Sparkles size={16} aria-hidden="true" />
        You made the top three!
      </p>
    </>
  );
}

export function Podium({
  snapshot,
  onSkip,
}: {
  snapshot: RoomView;
  onSkip: () => void;
}) {
  const [playing, stop] = useCelebration(
    `funkwiz:celebration:host:${snapshot.sessionId}`,
  );
  const players =
    snapshot.podium ??
    snapshot.leaderboard.filter((player) => player.rank <= 3);
  if (!players.length) return null;
  return (
    <section
      className="podium-stage"
      data-playing={playing}
      aria-label="Final podium"
    >
      <div className="podium-light podium-light-left" aria-hidden="true" />
      <div className="podium-light podium-light-right" aria-hidden="true" />
      <div className="podium-fireworks" aria-hidden="true">
        {[0, 1, 2].map((burst) => (
          <div className={`firework-burst burst-${burst}`} key={burst}>
            {Array.from({ length: 10 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    "--ray": `${i * 36}deg`,
                    animationDelay: `${1.4 + burst * 0.45}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>
      <Confetti playing={playing} />
      <div className="podium-heading">
        <span className="eyebrow">THE FINAL PODIUM</span>
        <h2>A round of applause.</h2>
        <p>
          {snapshot.title} · {snapshot.playerCount}{" "}
          {snapshot.playerCount === 1 ? "player" : "players"}
        </p>
      </div>
      {playing && (
        <button
          className="podium-skip"
          onClick={() => {
            stop();
            onSkip();
          }}
        >
          Skip animation
        </button>
      )}
      <div className="podium-places">
        {[2, 1, 3].map((rank) => {
          const tied = players.filter((player) => player.rank === rank);
          return (
            <div
              key={rank}
              className={`podium-place place-${rank}${tied.length ? "" : " podium-empty"}`}
              style={{
                animationDelay: `${rank === 1 ? 1.4 : rank === 2 ? 0.8 : 0.2}s`,
              }}
            >
              {tied.length ? (
                <>
                  <div className="podium-medal">
                    {rank === 1 ? (
                      <Crown aria-hidden="true" />
                    ) : (
                      <Trophy aria-hidden="true" />
                    )}
                  </div>
                  <div className="podium-names">
                    {tied.slice(0, 3).map((player) => (
                      <strong key={player.id}>{player.nickname}</strong>
                    ))}
                    {tied.length > 3 && (
                      <details>
                        <summary>+{tied.length - 3} share this rank</summary>
                        <ul>
                          {tied.slice(3).map((player) => (
                            <li key={player.id}>{player.nickname}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <span className="podium-points">
                    {tied[0].correctCount !== undefined
                      ? `${tied[0].correctCount} correct · `
                      : ""}
                    {tied[0].score.toLocaleString()} points
                    {tied.length > 1 ? " · shared rank" : ""}
                  </span>
                  <div className="podium-block">
                    <span>#{rank}</span>
                  </div>
                </>
              ) : (
                <span className="sr-only">No player ranked {rank}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="podium-cheer">
        Big ideas. Brave guesses. Brilliant company.
      </p>
    </section>
  );
}
