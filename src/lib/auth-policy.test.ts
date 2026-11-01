import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authConfigured,
  googleProvider,
  isTeacher,
  trustedOrigins,
} from "./auth-policy";

const base = {
  TEACHER_EMAIL: "teacher@example.test",
  BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
  BETTER_AUTH_URL: "http://127.0.0.1:3000",
};
test("Google is omitted unless both server credentials are nonempty", () => {
  for (const settings of [
    {},
    { GOOGLE_CLIENT_ID: "id" },
    { GOOGLE_CLIENT_SECRET: "secret" },
    { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "  " },
    { GOOGLE_CLIENT_ID: " ", GOOGLE_CLIENT_SECRET: "secret" },
  ]) {
    assert.equal(googleProvider(settings), undefined);
  }
  assert.deepEqual(
    googleProvider({
      GOOGLE_CLIENT_ID: " id ",
      GOOGLE_CLIENT_SECRET: " secret ",
    }),
    { clientId: "id", clientSecret: "secret", prompt: "select_account" },
  );
});
test("teacher access requires the exact normalized email", () => {
  assert.equal(isTeacher(" TEACHER@EXAMPLE.TEST ", base), true);
  for (const email of [
    "outsider@example.test",
    "teacher+extra@example.test",
    undefined,
  ])
    assert.equal(isTeacher(email, base), false);
  assert.equal(isTeacher("", {}), false);
});
test("authentication fails closed without required configuration or a safe URL", () => {
  assert.equal(authConfigured(base), true);
  assert.equal(
    authConfigured({ ...base, BETTER_AUTH_URL: "https://quiz.example.com" }),
    true,
  );
  for (const settings of [
    { ...base, TEACHER_EMAIL: "" },
    { ...base, BETTER_AUTH_SECRET: "short" },
    { ...base, BETTER_AUTH_URL: "http://public.example.com" },
    { ...base, BETTER_AUTH_URL: "javascript:alert(1)" },
    { ...base, BETTER_AUTH_URL: "invalid" },
  ])
    assert.equal(authConfigured(settings), false);
});
test("production trusts only its configured origin; local aliases stay local", () => {
  assert.deepEqual(
    trustedOrigins({ ...base, BETTER_AUTH_URL: "https://quiz.example.com" }),
    ["https://quiz.example.com"],
  );
  assert.deepEqual(trustedOrigins(base), [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ]);
});
