import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  configureDeploymentTemplate,
  deploymentMode,
  variablesWithoutSecrets,
} from "./deploy-template";
const wrangler = readFileSync("wrangler.jsonc", "utf8");
const pkg = readFileSync("package.json", "utf8");
for (const mode of ["personal", "school"] as const)
  test(`${mode} template preselects the correct isolated Worker, database and mode`, () => {
    const result = configureDeploymentTemplate(wrangler, pkg, mode);
    assert.equal(result.config.vars?.FUNKWIZ_MODE, mode);
    assert.equal(result.config.name, `funkwiz-${mode}`);
    assert.equal(
      result.config.d1_databases.find((db) => db.binding === "DB")
        ?.database_name,
      `funkwiz-${mode}`,
    );
    assert.equal(result.config.account_id, undefined);
    assert.equal(
      result.config.d1_databases[0].database_id,
      "00000000-0000-0000-0000-000000000000",
    );
    assert.ok(
      result.pkg.cloudflare.bindings.FUNKWIZ_MODE.description
        .toLowerCase()
        .includes(mode),
    );
    const input = JSON.parse(pkg);
    assert.deepEqual(
      (result.pkg as unknown as { scripts: unknown }).scripts,
      input.scripts,
    );
  });
test("template generation refuses private resource identifiers and invalid modes", () => {
  assert.throws(() => deploymentMode("organization"));
  assert.throws(() => deploymentMode("School"));
  const config = configureDeploymentTemplate(wrangler, pkg, "personal").config;
  assert.throws(() =>
    configureDeploymentTemplate(
      JSON.stringify({ ...config, account_id: "a".repeat(32) }),
      pkg,
      "school",
    ),
  );
  assert.throws(() =>
    configureDeploymentTemplate(
      JSON.stringify({
        ...config,
        d1_databases: [
          {
            binding: "DB",
            database_id: "11111111-1111-4111-8111-111111111111",
          },
        ],
      }),
      pkg,
      "school",
    ),
  );
});
test("private secrets cannot be shadowed by a template mode default", () => {
  assert.deepEqual(
    variablesWithoutSecrets(
      { FUNKWIZ_MODE: "personal", OTHER: "keep" },
      { FUNKWIZ_MODE: "school" },
    ),
    { OTHER: "keep" },
  );
  assert.deepEqual(variablesWithoutSecrets({ FUNKWIZ_MODE: "school" }, {}), {
    FUNKWIZ_MODE: "school",
  });
  assert.equal(
    variablesWithoutSecrets(undefined, { FUNKWIZ_MODE: "school" }),
    undefined,
  );
});
