import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts/showcase",
  testMatch: "capture.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3102",
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
    locale: "en-GB",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "bun scripts/prepare-e2e.ts school && bun run db:migrate:e2e-school && bun run dev --mode e2e-school --port 3102 --host 127.0.0.1",
    url: "http://127.0.0.1:3102",
    timeout: 120_000,
    reuseExistingServer: false,
    env: { WRANGLER_LOG_PATH: "/tmp/funkwiz-showcase-wrangler.log" },
  },
});
