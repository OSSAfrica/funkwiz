import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { createServer } from "node:net";
import { createInterface } from "node:readline/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { execFileSync, spawnSync } from "node:child_process";
import {
  classroomAddresses,
  classroomEmail,
  classroomPort,
} from "./lib/classroom";
import { parseWranglerTemplate } from "./lib/wrangler-config";

const { values } = parseArgs({
  options: {
    host: { type: "string" },
    port: { type: "string" },
    email: { type: "string" },
    prepare: { type: "boolean" },
    rebuild: { type: "boolean" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(
    "bun run classroom [--email you@example.com] [--host LAN_IP] [--port 3000] [--prepare] [--rebuild]\nPersonal mode only. --prepare builds without starting; --rebuild refreshes a prepared build.\nRead the private setup code with bun run classroom:code.",
  );
  process.exit(0);
}
// All classroom output must stay local and ignored, including credentials.
execFileSync("git", ["check-ignore", "--no-index", ".classroom/settings.json"]);
if (
  execFileSync("git", ["ls-files", "--", ".classroom"], {
    encoding: "utf8",
  }).trim()
)
  throw new Error("Classroom files must not be tracked by Git.");
if (!existsSync("node_modules/vite/bin/vite.js"))
  throw new Error(
    "Install dependencies while online first: bun install --frozen-lockfile",
  );
const directory = ".classroom";
const settingsPath = `${directory}/settings.json`;
const saved = existsSync(settingsPath)
  ? (JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, string>)
  : null;
const addresses = classroomAddresses(networkInterfaces());
if (!addresses.length)
  throw new Error(
    "No private IPv4 network found. Connect to your classroom Wi-Fi/router, then try again.",
  );
let host = values.host;
if (!host && saved?.BETTER_AUTH_URL) {
  const previous = new URL(saved.BETTER_AUTH_URL).hostname;
  if (addresses.some((entry) => entry.address === previous)) host = previous;
}
if (!host && addresses.length === 1) host = addresses[0].address;
async function ask(prompt: string) {
  if (!process.stdin.isTTY)
    throw new Error(
      `${prompt} Supply --host and --email explicitly when running without a terminal.`,
    );
  const input = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return (await input.question(prompt)).trim();
  } finally {
    input.close();
  }
}
if (!host) {
  console.log("Choose the network your students use:");
  addresses.forEach((entry, index) =>
    console.log(`${index + 1}. ${entry.name}: ${entry.address}`),
  );
  const choice = await ask("Network number: ");
  host = addresses[Number(choice) - 1]?.address;
}
if (!host || !addresses.some((entry) => entry.address === host))
  throw new Error(
    "--host must be a private IPv4 address assigned to this computer.",
  );
const port = classroomPort(
  values.port ??
    ((saved?.BETTER_AUTH_URL ? new URL(saved.BETTER_AUTH_URL).port : "") ||
      "3000"),
);
const origin = `http://${host}:${port}`;
const email = classroomEmail(
  values.email ??
    saved?.TEACHER_EMAIL ??
    (await ask("Teacher email (used only for local sign-in): ")),
);
if (saved && email !== saved.TEACHER_EMAIL)
  throw new Error(
    "This classroom already has a teacher identity. Use its existing email; changing --email does not migrate accounts.",
  );
const settings = {
  BETTER_AUTH_SECRET:
    saved?.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url"),
  TEACHER_SETUP_TOKEN:
    saved?.TEACHER_SETUP_TOKEN ?? randomBytes(32).toString("base64url"),
  TEACHER_EMAIL: email,
  BETTER_AUTH_URL: origin,
  FUNKWIZ_MODE: "personal",
  FUNKWIZ_LOCAL_CLASSROOM: "true",
};
if (
  [settings.BETTER_AUTH_SECRET, settings.TEACHER_SETUP_TOKEN].some(
    (secret) => typeof secret !== "string" || secret.length < 32,
  )
)
  throw new Error(
    "Classroom credentials are invalid. Restore your settings backup; do not delete your database.",
  );
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", {
  mode: 0o600,
});
chmodSync(settingsPath, 0o600);
const dotenv =
  Object.entries(settings)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n";
writeFileSync(`${directory}/.dev.vars`, dotenv, { mode: 0o600 });
const template = parseWranglerTemplate(readFileSync("wrangler.jsonc", "utf8"));
// Build a small explicit local configuration rather than inheriting cloud resources.
const config = {
  $schema: "../node_modules/wrangler/config-schema.json",
  name: "funkwiz-classroom",
  main: "../src/server.ts",
  compatibility_date: template.compatibility_date,
  compatibility_flags: template.compatibility_flags,
  workers_dev: false,
  send_metrics: false,
  vars: {
    FUNKWIZ_MODE: "personal",
    FUNKWIZ_LOCAL_CLASSROOM: "true",
    BETTER_AUTH_URL: origin,
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: "funkwiz-classroom",
      database_id: "00000000-0000-0000-0000-000000000001",
      migrations_dir: "../migrations",
      remote: false,
    },
  ],
  durable_objects: template.durable_objects,
  migrations: template.migrations,
};
writeFileSync(
  `${directory}/wrangler.json`,
  JSON.stringify(config, null, 2) + "\n",
  { mode: 0o600 },
);
const offlineEnv = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  WRANGLER_NO_SKILLS_UPDATE_PROMPTS: "true",
  CLOUDFLARE_ENV: "",
  CI: "true",
};
function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: offlineEnv,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Detect source/config changes without Git or network access during classroom play.
const hash = createHash("sha256");
function fingerprint(path: string) {
  for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) fingerprint(file);
    else if (entry.isFile() && entry.name !== "routeTree.gen.ts")
      hash.update(file).update(readFileSync(file));
  }
}
for (const path of ["src", "public", "migrations", "scripts/lib"])
  fingerprint(path);
for (const path of [
  "package.json",
  "bun.lock",
  "vite.config.ts",
  "tsconfig.json",
  "scripts/classroom.ts",
  `${directory}/wrangler.json`,
])
  hash.update(readFileSync(path));
const digest = hash.digest("hex");
const marker = `${directory}/prepared.json`;
const built = `${directory}/dist/server/wrangler.json`;
const prepared = existsSync(marker)
  ? JSON.parse(readFileSync(marker, "utf8"))
  : null;
if (values.rebuild || prepared?.digest !== digest || !existsSync(built)) {
  console.log("Preparing your offline classroom build…");
  run(process.execPath, [
    "node_modules/vite/bin/vite.js",
    "build",
    "--mode",
    "classroom",
  ]);
  run(process.execPath, ["scripts/check-client-secrets.ts", "--classroom"]);
  writeFileSync(marker, JSON.stringify({ digest }) + "\n");
}
// Wrangler reads .dev.vars beside the built config, never the development profile.
writeFileSync(`${directory}/dist/server/.dev.vars`, dotenv, { mode: 0o600 });
const builtConfig = JSON.parse(readFileSync(built, "utf8"));
if (
  builtConfig.name !== config.name ||
  builtConfig.account_id ||
  builtConfig.vars?.FUNKWIZ_MODE !== "personal" ||
  builtConfig.vars?.FUNKWIZ_LOCAL_CLASSROOM !== "true"
)
  throw new Error("Wrong build target. Run again with --rebuild.");
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
run("node", [
  wrangler,
  "d1",
  "migrations",
  "apply",
  "DB",
  "--local",
  "--config",
  built,
  "--persist-to",
  `${directory}/state`,
]);
if (values.prepare) {
  console.log(
    "Classroom prepared. Run bun run classroom on this network to start, even without internet.",
  );
  process.exit(0);
}
await new Promise<void>((resolvePort, reject) => {
  const probe = createServer();
  probe.once("error", () =>
    reject(
      new Error(
        `Port ${port} is unavailable on ${host}. Stop the other server or choose --port.`,
      ),
    ),
  );
  probe.listen(port, host, () => probe.close(() => resolvePort()));
});
console.log(
  `\nFunkwiz · Offline Personal classroom\nTeacher: ${origin}/login\nStudents: ${origin}/join\n\nConnect every device to the same Wi-Fi/router. Internet is not required.\nUse this network address on the teacher screen so lobby QR codes work.\nKeep this laptop awake. Press Ctrl+C to stop.\nFirst setup/recovery code: bun run classroom:code (keep it private).\n`,
);
run("node", [
  wrangler,
  "dev",
  "--local",
  "--config",
  built,
  "--ip",
  host,
  "--port",
  String(port),
  "--persist-to",
  `${directory}/state`,
  "--inspector-port",
  "0",
  "--show-interactive-dev-session=false",
]);
