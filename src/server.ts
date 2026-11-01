import handler from "@tanstack/react-start/server-entry";
import { handleLiveRequest } from "./server/live-api";
export { GameRoom, JoinLimiter } from "./server/game-room";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/live/"))
      return handleLiveRequest(request, env);
    return handler.fetch(request);
  },
} satisfies ExportedHandler<Env>;
