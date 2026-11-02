import { rmSync } from "node:fs";
// This directory is exclusively the disposable browser-test database.
const path =
  process.argv[2] === "school"
    ? ".wrangler/e2e-school-state"
    : process.argv[2] === "google"
      ? ".wrangler/e2e-google-state"
      : ".wrangler/e2e-state";
rmSync(path, { recursive: true, force: true });
