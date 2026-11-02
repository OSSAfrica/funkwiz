import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWranglerTemplate } from "./wrangler-config";

test("Wrangler JSONC accepts comments and trailing commas while preserving target and binding settings", () => {
  const config = parseWranglerTemplate(`{
    // Public template; values are fictional.
    "name": "test-classroom",
    "keep_vars": true,
    "d1_databases": [{
      "binding": "DB",
      "database_id": "11111111-1111-4111-8111-111111111111",
      "migrations_dir": "migrations",
    }],
  }`);
  assert.deepEqual(config, {
    name: "test-classroom",
    keep_vars: true,
    d1_databases: [
      {
        binding: "DB",
        database_id: "11111111-1111-4111-8111-111111111111",
        migrations_dir: "migrations",
      },
    ],
  });
});

test("malformed JSONC cannot produce a partial deployment configuration", () => {
  for (const source of [
    '{"name":"test-classroom" "d1_databases":[{"binding":"DB"}]}',
    '{"name":"test-classroom","d1_databases":[{"binding":"DB"}]',
  ])
    assert.throws(() => parseWranglerTemplate(source));
});

test("missing or invalid deployment fields fail before target selection", () => {
  for (const value of [
    null,
    [],
    {},
    { name: "test-classroom" },
    { name: "test-classroom", d1_databases: [] },
    { name: "test-classroom", d1_databases: [null] },
    {
      name: "test-classroom",
      d1_databases: [{ binding: "DB", database_id: 123 }],
    },
  ])
    assert.throws(() => parseWranglerTemplate(JSON.stringify(value)));
});
