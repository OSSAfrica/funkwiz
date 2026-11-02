import { test } from "node:test";
import assert from "node:assert/strict";
import { setupCodeMatches } from "./setup-code.server";
test("recovery proof requires the exact long private setup code", () => {
  const code = "a-private-setup-code-with-at-least-thirty-two-characters";
  assert.equal(setupCodeMatches(code, code), true);
  for (const provided of [
    "",
    "123456",
    code.toUpperCase(),
    `${code}x`,
    code.slice(1),
  ])
    assert.equal(setupCodeMatches(provided, code), false);
  assert.equal(setupCodeMatches("short", "short"), false);
  assert.equal(setupCodeMatches("", ""), false);
});
