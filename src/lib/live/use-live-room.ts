import { useCallback, useEffect, useRef, useState } from "react";
import { liveRequest, LiveRequestError } from "./client";
import type { RoomRole, RoomView } from "./protocol";

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "replaced"
  | "unauthorized"
  | "closed";
export function useLiveRoom(code: string, role: RoomRole) {
  const [snapshot, setSnapshot] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const [restart, setRestart] = useState(0);
  const [offset, setOffset] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const reconnect = useCallback(() => {
    setError("");
    setStatus("connecting");
    setRestart((value) => value + 1);
  }, []);
  const accept = useCallback((next: RoomView) => {
    setSnapshot((current) =>
      current && current.code === next.code && current.revision > next.revision
        ? current
        : next,
    );
    setOffset(next.serverNow - Date.now());
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false,
      opening = false,
      terminal = false,
      attempt = 0,
      retry: ReturnType<typeof setTimeout> | undefined;
    let lastPong = Date.now();
    const path = `/api/live/rooms/${code}?role=${role}`;
    function schedule() {
      if (stopped || terminal || retry) return;
      setStatus("reconnecting");
      retry = setTimeout(
        () => {
          retry = undefined;
          void connect();
        },
        Math.min(500 * 2 ** attempt++, 5000),
      );
    }
    async function connect() {
      if (
        stopped ||
        terminal ||
        opening ||
        socket.current?.readyState === WebSocket.OPEN ||
        socket.current?.readyState === WebSocket.CONNECTING
      )
        return;
      opening = true;
      try {
        const next = await liveRequest<RoomView>(
          path,
          undefined,
          controller.signal,
        );
        if (stopped) return;
        accept(next);
        const url = new URL(
          `/api/live/rooms/${code}/socket?role=${role}`,
          location.origin,
        );
        url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(url);
        socket.current = ws;
        ws.onopen = () => {
          if (stopped) {
            ws.close();
            return;
          }
          attempt = 0;
          lastPong = Date.now();
          setStatus("connected");
          setError("");
        };
        ws.onmessage = (event) => {
          if (stopped) return;
          lastPong = Date.now();
          if (event.data === "pong") return;
          try {
            const message = JSON.parse(event.data) as {
              type: string;
              data: RoomView;
            };
            if (message.type === "state") accept(message.data);
          } catch {
            ws.close(1008, "Invalid game update");
          }
        };
        ws.onclose = (event) => {
          if (stopped || socket.current !== ws) return;
          socket.current = null;
          if (event.code === 4001) {
            terminal = true;
            setStatus("replaced");
            setError(
              "This game is open in another tab. Continue here to use this tab instead.",
            );
            return;
          }
          if (event.code === 4003) {
            terminal = true;
            setStatus("unauthorized");
            setError(
              role === "host"
                ? "Your teacher session ended. Sign in again to continue."
                : "Your place in this room is no longer available.",
            );
            return;
          }
          if (event.code === 4004) {
            terminal = true;
            setStatus("closed");
            setError("This game has expired. Ask your teacher for a new code.");
            return;
          }
          schedule();
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch (cause) {
        if (stopped || controller.signal.aborted) return;
        if (
          cause instanceof LiveRequestError &&
          [401, 403, 404, 410].includes(cause.status)
        ) {
          terminal = true;
          setStatus(
            [401, 403].includes(cause.status) ? "unauthorized" : "closed",
          );
          setError(cause.message);
          return;
        }
        setError("Connection interrupted. We’re trying to reconnect…");
        schedule();
      } finally {
        opening = false;
      }
    }
    const heartbeat = setInterval(() => {
      const ws = socket.current;
      if (ws?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastPong > 75_000) {
        ws.close();
        return;
      }
      // Resync checks host session revocation and refreshes the server clock.
      ws.send("sync");
      ws.send("ping");
    }, 30_000);
    const visible = () => {
      if (document.visibilityState !== "visible") return;
      if (socket.current?.readyState === WebSocket.OPEN)
        socket.current.send("sync");
      else if (!retry) void connect();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    void connect();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(retry);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
      socket.current?.close(1000, "Leaving the game");
      socket.current = null;
    };
  }, [code, role, restart, accept]);
  return {
    snapshot,
    status,
    error,
    offset,
    accept,
    reconnect,
    connected: status === "connected",
  };
}
export function useRoomCountdown(snapshot: RoomView | null, offset: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!snapshot?.deadline || snapshot.paused) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [snapshot?.deadline, snapshot?.paused]);
  return snapshot
    ? Math.max(
        0,
        Math.ceil(
          (snapshot.paused
            ? snapshot.remainingMs
            : (snapshot.deadline ?? now + offset) -
              Math.max(now, snapshot.serverNow - offset) -
              offset) / 1000,
        ),
      )
    : 0;
}
