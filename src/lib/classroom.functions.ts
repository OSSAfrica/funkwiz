import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { classroomOrigin } from "./classroom-policy";

export const getClassroomOrigin = createServerFn({ method: "GET" }).handler(
  () => classroomOrigin(env),
);
