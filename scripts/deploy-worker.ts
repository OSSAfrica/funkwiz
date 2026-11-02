import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseWranglerTemplate } from "./lib/wrangler-config";
import { assertDeploymentTarget } from "./lib/deployment";

const template = parseWranglerTemplate(readFileSync("wrangler.jsonc", "utf8"));
const configPath = "dist/server/wrangler.json";
assertDeploymentTarget(template, JSON.parse(readFileSync(configPath, "utf8")));
// Explicit paths prevent Wrangler's last-build redirect from choosing a private build.
for (const args of [
  ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--config", configPath],
  ["wrangler", "deploy", "--config", configPath],
]) {
  const result = spawnSync("bunx", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
