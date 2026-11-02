import type { ScoringRules } from "./scoring";
import type { GameSettings, DisplayMode, Quiz } from "../quiz";

export const MAX_PLAYERS = 200;
export const ROOM_LIFETIME = 8 * 60 * 60 * 1000;
export const RESULT_LIFETIME = 24 * 60 * 60 * 1000;
export const POINTS_PER_CORRECT = 1000;
export type RoomPhase = "lobby" | "question" | "reveal" | "finished" | "closed";
export type RoomRole = "host" | "student";
export type RoomMeta = {
  id: string;
  code: string;
  ownerId: string;
  workspaceId?: string | null;
  scoring?: ScoringRules;
  quiz: Quiz;
  settings: GameSettings;
  display: DisplayMode;
  phase: RoomPhase;
  index: number;
  deadline: number | null;
  paused: boolean;
  remainingMs: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  expiresAt: number;
  reportSaved: boolean;
};
export type HostAction =
  | { type: "start" | "pause" | "resume" | "end" }
  | { type: "reveal" | "next"; questionIndex: number }
  | { type: "settings"; settings: GameSettings }
  | { type: "remove-player"; playerId: string };
export type Player = {
  id: string;
  nickname: string;
  score: number;
  correctCount: number;
  joinedAt: number;
};
export type RankedPlayer = {
  id: string;
  nickname: string;
  score: number;
  rank: number;
};
export type RoomView = {
  code: string;
  sessionId: string;
  title: string;
  phase: RoomPhase;
  revision: number;
  serverNow: number;
  role: RoomRole;
  questionIndex: number;
  questionCount: number;
  settings: GameSettings;
  display: DisplayMode;
  deadline: number | null;
  paused: boolean;
  remainingMs: number;
  expiresAt: number;
  playerCount: number;
  connectedCount: number;
  hostOnline: boolean;
  answeredCount: number;
  roster: { id: string; nickname: string; connected: boolean }[];
  leaderboard: RankedPlayer[];
  question: null | {
    id: string;
    prompt: string | null;
    answers: string[] | null;
    correctIndex?: number;
    counts?: number[];
  };
  self: null | {
    id: string;
    nickname: string;
    score: number;
    rank: number;
    correctCount: number;
    answer: number | null;
    correct: boolean | null;
    pointsEarned?: number | null;
    correctOrder?: number | null;
  };
  scoring?: ScoringRules;
  reportSaved: boolean;
};
export type GameReport = {
  id: string;
  code: string;
  title: string;
  startedAt: number | null;
  endedAt: number;
  playerCount: number;
  /** Legacy reports store flat points; new reports store their scoring rules. */
  pointsPerCorrect?: number;
  scoring?: ScoringRules;
  leaderboard: RankedPlayer[];
  questions: {
    id: string;
    prompt: string;
    answers: string[];
    correctIndex: number;
    counts: number[];
    asked: boolean;
    correct: number;
    answered: number;
  }[];
};
export function roomCode(value: string) {
  if (!/^\d{6}$/.test(value)) throw new Error("Enter a six-digit game code.");
  return value;
}
export function nickname(value: unknown) {
  if (typeof value !== "string") throw new Error("Choose a nickname.");
  const clean = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    clean.length < 2 ||
    clean.length > 24 ||
    !/^[\p{L}\p{N} ._-]+$/u.test(clean)
  )
    throw new Error(
      "Use 2–24 letters, numbers, spaces, dots, underscores, or dashes.",
    );
  return clean;
}
export function gameSettings(value: unknown): GameSettings {
  if (!value || typeof value !== "object")
    throw new Error("Choose your game settings.");
  const data = value as Record<string, unknown>;
  if (
    !["manual", "automatic"].includes(String(data.progression)) ||
    !["shared", "devices", "both"].includes(String(data.display)) ||
    !Number.isInteger(data.cooldown) ||
    Number(data.cooldown) < 1 ||
    Number(data.cooldown) > 60
  )
    throw new Error(
      "Use a valid display mode, progression mode, and 1–60 second cooldown.",
    );
  return {
    progression: data.progression as GameSettings["progression"],
    display: data.display as DisplayMode,
    cooldown: Number(data.cooldown),
  };
}
export function hostAction(value: unknown): HostAction {
  if (!value || typeof value !== "object")
    throw new Error("Choose a game control.");
  const data = value as Record<string, unknown>;
  if (["start", "pause", "resume", "end"].includes(String(data.type)))
    return { type: data.type as "start" | "pause" | "resume" | "end" };
  if (data.type === "settings")
    return { type: "settings", settings: gameSettings(data.settings) };
  if (
    data.type === "remove-player" &&
    typeof data.playerId === "string" &&
    data.playerId.length <= 100
  )
    return { type: "remove-player", playerId: data.playerId };
  if (
    (data.type === "next" || data.type === "reveal") &&
    Number.isInteger(data.questionIndex) &&
    Number(data.questionIndex) >= 0
  )
    return { type: data.type, questionIndex: Number(data.questionIndex) };
  throw new Error("That game control is not valid.");
}
export function rankPlayers(players: Player[]): RankedPlayer[] {
  const sorted = [...players].sort(
    (a, b) =>
      b.score - a.score || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id),
  );
  let rank = 1;
  return sorted.map((player, index) => {
    if (index > 0 && player.score !== sorted[index - 1].score) rank = index + 1;
    return {
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      rank,
    };
  });
}
