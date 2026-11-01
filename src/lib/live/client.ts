import type { GameSettings } from "../quiz";
import type { HostAction, RoomView } from "./protocol";
export class LiveRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function liveRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = (await response.json()) as { message?: string };
  if (!response.ok)
    throw new LiveRequestError(
      data.message || "The game could not be reached. Please try again.",
      response.status,
    );
  return data as T;
}
export const openLiveRoom = (quizId: string, settings: GameSettings) =>
  liveRequest<{ code: string; sessionId: string }>("/api/live/rooms", {
    quizId,
    settings,
  });
export const controlRoom = (code: string, action: HostAction) =>
  liveRequest<RoomView>(`/api/live/rooms/${code}/control`, action);
export const submitAnswer = (
  code: string,
  questionId: string,
  answer: number,
) =>
  liveRequest<RoomView>(`/api/live/rooms/${code}/answer`, {
    questionId,
    answer,
  });
