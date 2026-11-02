import { createAuth } from "../src/lib/auth.server";
export { GameRoom, JoinLimiter } from "../src/server/game-room";
export default {
  fetch: (request: Request) => createAuth(false).handler(request),
};
