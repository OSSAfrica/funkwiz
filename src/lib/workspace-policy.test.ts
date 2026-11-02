import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canManageMembers,
  canReadWorkspaceQuiz,
  canViewReport,
  isWorkspaceRole,
} from "./workspace-policy";
import { schoolMode } from "./auth-policy";

test("School mode is explicit and Personal is the default", () => {
  assert.equal(schoolMode({}), false);
  assert.equal(schoolMode({ FUNKWIZ_MODE: "school" }), true);
  assert.equal(schoolMode({ FUNKWIZ_MODE: "School" }), false);
});
test("only the three workspace roles are accepted", () => {
  for (const role of ["owner", "admin", "teacher"])
    assert.equal(isWorkspaceRole(role), true);
  for (const role of [null, "", "member", "owner,admin", "superadmin"])
    assert.equal(isWorkspaceRole(role), false);
});
test("Admins and Owners review workspace reports but teachers review their own", () => {
  assert.equal(canViewReport("owner", "one", "two"), true);
  assert.equal(canViewReport("admin", "one", "two"), true);
  assert.equal(canViewReport("teacher", "one", "two"), false);
  assert.equal(canViewReport("teacher", "one", "one"), true);
  assert.equal(canViewReport(null, "one", "one"), false);
});
test("administration is not a private quiz permission", () => {
  assert.equal(canManageMembers("teacher"), false);
  assert.equal(canManageMembers("admin"), true);
  assert.equal(
    canReadWorkspaceQuiz("one", { ownerId: "two", visibility: "private" }),
    false,
  );
  assert.equal(
    canReadWorkspaceQuiz("one", { ownerId: "one", visibility: "private" }),
    true,
  );
  assert.equal(
    canReadWorkspaceQuiz("one", { ownerId: "two", visibility: "workspace" }),
    true,
  );
});
