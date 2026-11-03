import { test } from "node:test";
import assert from "node:assert/strict";
import { classroomEmail, classroomPort, classroomAddresses } from "./classroom";
import { privateIPv4, classroomOrigin } from "../../src/lib/classroom-policy";
import {
  authConfigured,
  googleProvider,
  trustedOrigins,
} from "../../src/lib/auth-policy";
import { emailConfigured } from "../../src/lib/email-provider";
import { assertDeploymentTarget } from "./deployment";
import { quizId } from "../../src/lib/uuid";

test("LAN addresses are restricted to literal RFC1918 IPv4 addresses", () => {
  for (const address of [
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.254",
    "192.168.1.20",
  ])
    assert.equal(privateIPv4(address), true);
  for (const address of [
    "127.0.0.1",
    "0.0.0.0",
    "8.8.8.8",
    "172.15.0.1",
    "172.32.0.1",
    "192.168.1.256",
    "192.168.01.2",
    "::1",
    "quiz.local",
  ])
    assert.equal(privateIPv4(address), false);
  assert.deepEqual(classroomAddresses({}), []);
  for (const port of ["0", "1023", "65536", "3000.5", "3e3"])
    assert.throws(() => classroomPort(port));
  assert.equal(classroomPort("3000"), 3000);
  assert.equal(
    classroomEmail(" TEACHER@EXAMPLE.TEST "),
    "teacher@example.test",
  );
});

test("LAN HTTP authentication requires explicit Personal classroom opt-in and trusts only the chosen origin", () => {
  const settings = {
    BETTER_AUTH_URL: "http://192.168.1.20:3000",
    FUNKWIZ_MODE: "personal",
    FUNKWIZ_LOCAL_CLASSROOM: "true",
    TEACHER_EMAIL: "teacher@example.test",
    BETTER_AUTH_SECRET: "test-only-classroom-secret-more-than-32-characters",
  };
  assert.equal(classroomOrigin(settings), settings.BETTER_AUTH_URL);
  assert.equal(authConfigured(settings), true);
  assert.deepEqual(trustedOrigins(settings), [settings.BETTER_AUTH_URL]);
  for (const patch of [
    { FUNKWIZ_LOCAL_CLASSROOM: undefined },
    { FUNKWIZ_MODE: "school" },
    { BETTER_AUTH_URL: "http://8.8.8.8:3000" },
    { BETTER_AUTH_URL: "http://192.168.1.20:3000/path" },
    { BETTER_AUTH_URL: "http://user:pass@192.168.1.20:3000" },
  ]) {
    assert.equal(classroomOrigin({ ...settings, ...patch }), null);
    assert.equal(authConfigured({ ...settings, ...patch }), false);
  }
  assert.equal(
    googleProvider({
      ...settings,
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
    }),
    undefined,
  );
  assert.equal(
    emailConfigured({
      ...settings,
      AUTH_EMAIL_FROM: "quiz@example.test",
      RESEND_API_KEY: "test-only-key",
    }),
    false,
  );
});

test("cloud deployment rejects offline classroom builds before remote commands", () => {
  const cloud = {
    name: "quiz",
    d1_databases: [
      { binding: "DB", database_id: "11111111-1111-4111-8111-111111111111" },
    ],
  };
  assert.throws(
    () =>
      assertDeploymentTarget(cloud, {
        ...cloud,
        vars: { FUNKWIZ_LOCAL_CLASSROOM: "true" },
      }),
    /cannot be deployed/,
  );
});

test("quiz identities remain unique valid UUIDs without relying on randomUUID", () => {
  const ids = Array.from({ length: 100 }, () => quizId());
  assert.equal(new Set(ids).size, 100);
  for (const id of ids)
    assert.match(
      id,
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
});
