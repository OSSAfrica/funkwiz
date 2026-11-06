import { correctAnswerPoints, scoringFor } from "./scoring";
import {
  rankPlayers,
  type Player,
  type RoomMeta,
  type RoomRole,
  type RoomView,
} from "./protocol";
export type ViewData = {
  players: Player[];
  answers: Map<string, number>;
  answerTimes?: Map<string, number>;
  connected: Set<string>;
  hostOnline: boolean;
  counts: number[];
  revision: number;
  now: number;
};
export function roomView(
  room: RoomMeta,
  data: ViewData,
  role: RoomRole,
  playerId?: string,
): RoomView {
  const revealed = room.phase === "reveal";
  const showQuestion = room.phase === "question" || revealed;
  const visible =
    revealed ||
    room.display === "both" ||
    (role === "host" ? room.display === "shared" : room.display === "devices");
  const q = room.quiz.questions[room.index];
  const scoring = scoringFor(room);
  const ranked = rankPlayers(data.players, scoring);
  const correctIds = revealed
    ? [...data.answers]
        .filter(([, choice]) => choice === q.correctIndex)
        .map(([id]) => id)
    : [];
  const correctPosition = playerId ? correctIds.indexOf(playerId) : -1;
  const player = data.players.find((p) => p.id === playerId);
  const answer = playerId ? (data.answers.get(playerId) ?? null) : null;
  return {
    code: room.code,
    sessionId: room.id,
    title: room.quiz.title,
    phase: room.phase,
    revision: data.revision,
    serverNow: data.now,
    role,
    questionIndex: room.index,
    questionCount: room.quiz.questions.length,
    settings: room.settings,
    scoring,
    display: room.display,
    deadline: room.deadline,
    paused: room.paused,
    remainingMs: room.remainingMs,
    expiresAt: room.expiresAt,
    playerCount: data.players.length,
    connectedCount: data.connected.size,
    hostOnline: data.hostOnline,
    answeredCount: data.answers.size,
    roster:
      role === "host" || room.phase === "lobby"
        ? data.players.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            connected: data.connected.has(p.id),
          }))
        : [],
    leaderboard:
      revealed || room.phase === "finished" ? ranked.slice(0, 10) : [],
    podium:
      room.phase === "finished"
        ? ranked.filter((player) => player.rank <= 3)
        : [],
    question: showQuestion
      ? {
          id: q.id,
          prompt: visible ? q.prompt : null,
          answers: visible ? q.answers : null,
          ...(revealed
            ? { correctIndex: q.correctIndex, counts: data.counts }
            : {}),
        }
      : null,
    self: player
      ? {
          id: player.id,
          nickname: player.nickname,
          score: player.score,
          rank: ranked.find((p) => p.id === player.id)?.rank ?? 0,
          correctCount: player.correctCount,
          answer,
          pointsEarned: revealed
            ? correctAnswerPoints(
                correctPosition,
                scoring,
                playerId ? data.answerTimes?.get(playerId) : undefined,
                q.duration * 1000,
              )
            : null,
          correctOrder:
            revealed && correctPosition >= 0 ? correctPosition + 1 : null,
          correct:
            revealed && answer !== null ? answer === q.correctIndex : null,
        }
      : null,
    reportSaved: room.reportSaved,
  };
}
