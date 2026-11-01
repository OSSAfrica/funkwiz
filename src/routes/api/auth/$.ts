import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "@/lib/auth.server";
import { authConfigured } from "@/lib/auth-policy";
import { env } from "cloudflare:workers";

function handler(request: Request) {
  if (!authConfigured(env))
    return Response.json(
      { message: "Teacher sign-in is not configured." },
      { status: 503 },
    );
  return createAuth().handler(request);
}
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request),
    },
  },
});
