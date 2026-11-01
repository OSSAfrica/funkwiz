import { mkdir } from "node:fs/promises";
import { request } from "@playwright/test";

export default async function setup() {
  const api = await request.newContext({ baseURL: "http://127.0.0.1:3100" });
  const response = await api.post("/api/auth/sign-up/email", {
    headers: {
      origin: "http://127.0.0.1:3100",
      "x-teacher-setup-code":
        "e2e-only-fake-setup-code-never-use-in-production",
    },
    data: {
      name: "Quiz Teacher",
      email: "teacher@example.test",
      password: "Only-a-local-test-password-42!",
    },
  });
  if (!response.ok())
    throw new Error(
      `Teacher fixture setup failed (${response.status()}): ${await response.text()}`,
    );
  await mkdir(".playwright", { recursive: true });
  await api.storageState({ path: ".playwright/teacher-session.json" });
  await api.dispose();
}
