import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

if (!existsSync("dist/client")) throw new Error("Run bun run build first.");
const config = existsSync(".dev.vars")
  ? parseEnv(readFileSync(".dev.vars", "utf8"))
  : {};
const privateValues = [
  "BETTER_AUTH_SECRET",
  "TEACHER_SETUP_TOKEN",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
]
  .map((key) => config[key])
  .filter(
    (value): value is string => typeof value === "string" && value.length >= 8,
  );
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
check("dist/client");
console.log(
  `Client asset check passed for ${privateValues.length} configured private values.`,
);
