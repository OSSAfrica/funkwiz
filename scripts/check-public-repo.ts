import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// A release-hygiene guard, not a replacement for a dedicated secret scanner.
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((path) => path && existsSync(path));
const privateConfig = existsSync(".dev.vars")
  ? parseEnv(readFileSync(".dev.vars", "utf8"))
  : {};
const privateValues = [
  "BETTER_AUTH_SECRET",
  "TEACHER_SETUP_TOKEN",
  "TEACHER_EMAIL",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "SMTP_PASSWORD",
]
  .flatMap((key) => [privateConfig[key], process.env[key]])
  .filter((value): value is string => Boolean(value && value.length >= 8));
if (existsSync(".deploy/target.json")) {
  const target = JSON.parse(readFileSync(".deploy/target.json", "utf8"));
  for (const key of ["accountId", "databaseId", "origin", "teacherEmail"]) {
    if (typeof target[key] === "string" && target[key].length >= 8)
      privateValues.push(target[key]);
  }
}
if (existsSync(".deploy/secrets.json")) {
  const secrets = JSON.parse(readFileSync(".deploy/secrets.json", "utf8"));
  for (const key of ["BETTER_AUTH_SECRET", "TEACHER_SETUP_TOKEN", "GOOGLE_CLIENT_SECRET", "RESEND_API_KEY", "SMTP_PASSWORD"])
    if (typeof secrets[key] === "string" && secrets[key].length >= 8)
      privateValues.push(secrets[key]);
}
const findings = new Set<string>();
for (const path of files) {
  if (
    /(^|\/)(\.deploy|\.idea|\.wrangler|\.playwright|node_modules|dist|test-results|playwright-report)(\/|$)/.test(path) ||
    /(^|\/)(\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/.test(path) && !path.endsWith(".example") ||
    /\.(pem|key|sqlite(?:-.*)?|db(?:-.*)?)$/.test(path)
  ) findings.add(path);
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const content = bytes.toString("utf8");
  if (/\/(?:Users|home)\/[^/\s]+\//.test(content) ||
      privateValues.some((value) => content.includes(value))) findings.add(path);
}
if (findings.size) {
  console.error("Public repository check found private/local content in:");
  for (const path of findings) console.error(`- ${path}`);
  // Do not print matched contents or private values.
  process.exitCode = 1;
} else console.log(`Public repository check passed for ${files.length} tracked files.`);
