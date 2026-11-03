import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateSettingValue } from "./private-values";

test("reserved example emails do not collide with public setup examples", () => {
  for (const email of [
    "you@example.com",
    "teacher@example.org",
    "teacher@school.example",
    "teacher@example.test",
    "teacher@funkwiz.invalid",
    "Teacher@DEMO.EXAMPLE.NET",
  ])
    assert.equal(isPrivateSettingValue("TEACHER_EMAIL", email), false);
  assert.equal(isPrivateSettingValue("teacherEmail", "you@example.com"), false);
  for (const email of [
    "teacher@school.edu",
    "you@example.com.attacker.org",
    "teacher@notexample.com",
  ])
    assert.equal(isPrivateSettingValue("TEACHER_EMAIL", email), true);
});

test("example-looking secret contents never bypass secret checks", () => {
  for (const key of [
    "BETTER_AUTH_SECRET",
    "TEACHER_SETUP_TOKEN",
    "RESEND_API_KEY",
    "GOOGLE_CLIENT_SECRET",
    "SMTP_PASSWORD",
  ])
    assert.equal(isPrivateSettingValue(key, "you@example.com"), true);
  assert.equal(isPrivateSettingValue("TEACHER_EMAIL", undefined), false);
});
