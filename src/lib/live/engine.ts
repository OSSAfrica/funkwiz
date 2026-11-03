import { DEFAULT_SCORING } from "./scoring";
import type { Quiz, GameSettings } from "../quiz";
import {
  ROOM_LIFETIME,
  RESULT_LIFETIME,
  type RoomMeta,
  type HostAction,
} from "./protocol";

export function createRoomMeta(
  id: string,
  code: string,
  ownerId: string,
  quiz: Quiz,
  settings: GameSettings,
  now: number,
): RoomMeta {
  return {
    id,
    code,
    ownerId,
    scoring: DEFAULT_SCORING,
    quiz,
    settings,
    display: settings.display,
    phase: "lobby",
    index: 0,
    deadline: null,
    paused: false,
    remainingMs: 0,
    createdAt: now,
    startedAt: null,
    endedAt: null,
    expiresAt: now + ROOM_LIFETIME,
    reportSaved: false,
  };
}
function nextQuestion(room: RoomMeta, now: number): RoomMeta {
  const index = room.phase === "lobby" ? 0 : room.index + 1;
  if (index >= room.quiz.questions.length) return finishRoom(room, now);
  return {
    ...room,
    phase: "question",
    index,
    display: room.settings.display,
    paused: false,
    remainingMs: 0,
    deadline: now + room.quiz.questions[index].duration * 1000,
    startedAt: room.startedAt ?? now,
  };
}
function reveal(room: RoomMeta, now: number): RoomMeta {
  return {
    ...room,
    phase: "reveal",
    paused: false,
    remainingMs: 0,
    deadline:
      room.settings.progression === "automatic"
        ? now + room.settings.cooldown * 1000
        : null,
  };
}
function finishRoom(room: RoomMeta, now: number): RoomMeta {
  return {
    ...room,
    phase: room.startedAt === null ? "closed" : "finished",
    paused: false,
    remainingMs: 0,
    deadline: null,
    endedAt: now,
    expiresAt: now + RESULT_LIFETIME,
  };
}
export function advanceRoom(room: RoomMeta, now: number): RoomMeta {
  if (room.paused || room.deadline === null || now < room.deadline) return room;
  if (room.phase === "question") return reveal(room, now);
  if (room.phase === "reveal") return nextQuestion(room, now);
  return room;
}
export function transitionRoom(
  room: RoomMeta,
  action: HostAction,
  now: number,
  players: number,
): RoomMeta {
  if (room.phase === "finished" || room.phase === "closed")
    throw new Error("This game has ended.");
  switch (action.type) {
    case "start":
      if (room.phase !== "lobby")
        throw new Error("This game has already started.");
      if (players < 1) throw new Error("Wait for at least one player to join.");
      return nextQuestion(room, now);
    case "reveal":
      if (room.phase !== "question" || action.questionIndex !== room.index)
        throw new Error(
          "The game moved on. Your controls have been refreshed.",
        );
      return reveal(room, now);
    case "next":
      if (room.phase !== "reveal" || action.questionIndex !== room.index)
        throw new Error(
          "The game moved on. Your controls have been refreshed.",
        );
      return nextQuestion(room, now);
    case "pause":
      if (room.paused) return room;
      if (room.deadline === null)
        throw new Error("There is no countdown to pause.");
      return {
        ...room,
        paused: true,
        remainingMs: Math.max(0, room.deadline - now),
        deadline: null,
      };
    case "resume":
      return room.paused
        ? {
            ...room,
            paused: false,
            deadline: now + room.remainingMs,
            remainingMs: 0,
          }
        : room;
    case "end":
      return finishRoom(room, now);
    case "settings": {
      if (
        room.phase === "question" &&
        Boolean(action.settings.allowAnswerChanges) !==
          Boolean(room.settings.allowAnswerChanges)
      )
        throw new Error("Change answer editing between questions.");
      if (
        room.phase === "question" &&
        action.settings.display !== room.settings.display
      )
        throw new Error("Change question visibility between questions.");
      const switched =
        room.phase === "reveal" &&
        action.settings.progression !== room.settings.progression;
      return {
        ...room,
        settings: action.settings,
        display:
          room.phase === "lobby" ? action.settings.display : room.display,
        paused: switched ? false : room.paused,
        remainingMs: switched ? 0 : room.remainingMs,
        deadline: switched
          ? action.settings.progression === "automatic"
            ? now + action.settings.cooldown * 1000
            : null
          : room.deadline,
      };
    }
    case "remove-player":
      if (room.phase !== "lobby")
        throw new Error("Players can only be removed in the lobby.");
      return room;
  }
}
