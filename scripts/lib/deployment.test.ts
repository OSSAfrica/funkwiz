import { test } from "node:test";
import assert from "node:assert/strict";
import { assertDeploymentTarget } from "./deployment";

const source = {
  name: "test-classroom",
  account_id: "a".repeat(32),
  d1_databases: [
    { binding: "DB", database_id: "11111111-1111-4111-8111-111111111111" },
  ],
};
test("matching built and source targets can deploy", () => {
  assert.doesNotThrow(() =>
    assertDeploymentTarget(source, structuredClone(source)),
  );
});
test("public source refuses a private build", () => {
  assert.throws(() =>
    assertDeploymentTarget({ ...source, account_id: undefined }, source),
  );
});
test("wrong account, Worker and database each stop deployment", () => {
  for (const built of [
    { ...source, account_id: "b".repeat(32) },
    { ...source, name: "another-classroom" },
    {
      ...source,
      d1_databases: [
        { binding: "DB", database_id: "22222222-2222-4222-8222-222222222222" },
      ],
    },
  ])
    assert.throws(() => assertDeploymentTarget(source, built));
});
test("missing DB binding stops deployment", () => {
  assert.throws(() =>
    assertDeploymentTarget(source, { ...source, d1_databases: [] }),
  );
});
test("template database IDs never reach remote deployment", () => {
  const template = {
    ...source,
    d1_databases: [
      { binding: "DB", database_id: "00000000-0000-0000-0000-000000000000" },
    ],
  };
  assert.throws(() => assertDeploymentTarget(template, template));
});
