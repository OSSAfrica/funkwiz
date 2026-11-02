import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { parseWranglerTemplate } from "./lib/wrangler-config";
import { assertDeploymentTarget } from "./lib/deployment";

const action = process.argv[2] ?? "dry-run";
if (!["build", "dry-run", "deploy"].includes(action)) throw new Error("Use build, dry-run or deploy.");
const targetPath = ".deploy/target.json";
if (!existsSync(targetPath)) throw new Error("Create the ignored .deploy/target.json first; see docs/PRIVATE_DEPLOY.md.");
execFileSync("git", ["check-ignore", "--no-index", targetPath]);
if (execFileSync("git", ["ls-files", "--", ".deploy"], { encoding: "utf8" }).trim())
  throw new Error("Private deployment files must never be tracked by Git.");
const target = JSON.parse(readFileSync(targetPath, "utf8"));
if (!/^[a-f0-9]{32}$/i.test(target.accountId ?? "") ||
    !/^[a-f0-9-]{36}$/i.test(target.databaseId ?? "") ||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(target.workerName ?? "") ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(target.databaseName ?? "") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.teacherEmail ?? ""))
  throw new Error("Private target settings are incomplete or invalid.");
const origin = new URL(target.origin);
if (origin.protocol !== "https:" || origin.href !== origin.origin + "/" || origin.username || origin.password)
  throw new Error("Production origin must be an exact HTTPS origin without credentials, path or query.");
const template = parseWranglerTemplate(readFileSync("wrangler.jsonc", "utf8"));
const config = {
  ...template,
  $schema: "../node_modules/wrangler/config-schema.json",
  name: target.workerName,
  account_id: target.accountId,
  main: "../src/server.ts",
  workers_dev: true,
  keep_vars: true,
  d1_databases: template.d1_databases.map((db) => {
    if (db.binding !== "DB") throw new Error("Review additional D1 bindings before privately deploying.");
    return { ...db, database_name: target.databaseName, database_id: target.databaseId, migrations_dir: "../migrations" };
  }),
};
mkdirSync(".deploy", { recursive: true, mode: 0o700 });
chmodSync(".deploy", 0o700);
chmodSync(targetPath, 0o600);
writeFileSync(".deploy/wrangler.json", JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
const secretsPath = ".deploy/secrets.json";
if (!existsSync(secretsPath)) writeFileSync(secretsPath, JSON.stringify({
  BETTER_AUTH_URL: origin.origin,
  TEACHER_EMAIL: target.teacherEmail.trim().toLowerCase(),
  BETTER_AUTH_SECRET: randomBytes(32).toString("base64url"),
  TEACHER_SETUP_TOKEN: randomBytes(32).toString("base64url"),
}, null, 2) + "\n", { mode: 0o600, flag: "wx" });
const secrets = JSON.parse(readFileSync(secretsPath, "utf8"));
if (secrets.BETTER_AUTH_URL !== origin.origin ||
    secrets.TEACHER_EMAIL !== target.teacherEmail.trim().toLowerCase() ||
    [secrets.BETTER_AUTH_SECRET, secrets.TEACHER_SETUP_TOKEN].some(value => typeof value !== "string" || value.length < 32))
  throw new Error("Private secrets do not match the target. Review them without printing or committing them.");
chmodSync(secretsPath, 0o600);
function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: target.accountId, CLOUDFLARE_ENV: "" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("bunx", ["vite", "build", "--mode", "private"]);
const builtPath = ".deploy/dist/server/wrangler.json";
assertDeploymentTarget(config, JSON.parse(readFileSync(builtPath, "utf8")));
run("bun", ["run", "check:client-secrets", "--private"]);
run("bun", ["run", "check:public"]);
if (action === "build") process.exit(0);
if (action === "dry-run") {
  run("bunx", ["wrangler", "deploy", "--dry-run", "--config", builtPath]);
} else {
  run("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", builtPath]);
  run("bunx", ["wrangler", "deploy", "--config", builtPath, "--secrets-file", secretsPath]);
}
