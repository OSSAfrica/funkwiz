import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { isPrivateSettingValue } from "./lib/private-values";

const production = process.argv.includes("--private");
const classroom = process.argv.includes("--classroom");
const directory = classroom
  ? ".classroom/dist/client"
  : production
    ? ".deploy/dist/client"
    : "dist/client";
if (!existsSync(directory))
  throw new Error("Build the intended public or private target first.");
const config = classroom
  ? JSON.parse(readFileSync(".classroom/settings.json", "utf8"))
  : production
    ? JSON.parse(readFileSync(".deploy/secrets.json", "utf8"))
    : existsSync(".dev.vars")
      ? parseEnv(readFileSync(".dev.vars", "utf8"))
      : {};
const privateValues = [
  "BETTER_AUTH_SECRET",
  "TEACHER_SETUP_TOKEN",
  "TEACHER_EMAIL",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "SMTP_PASSWORD",
].flatMap((key) =>
  isPrivateSettingValue(key, config[key]) ? [config[key] as string] : [],
);
if (production) {
  const target = JSON.parse(readFileSync(".deploy/target.json", "utf8"));
  privateValues.push(target.accountId, target.databaseId);
}
function check(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) check(path);
    else if (/\.(js|css|html|json|map)$/.test(path)) {
      const text = readFileSync(path, "utf8");
      if (privateValues.some((value) => text.includes(value)))
        throw new Error(`A private configuration value was found in ${path}.`);
    }
  }
}
check(directory);
console.log(
  `Client asset check passed for ${privateValues.length} configured private values.`,
);
