import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  globalSetup: "./e2e/global-setup.ts",
  // Keep local browser/Workers scenarios from competing for the same CPU.
  // The capacity scenario still connects 150 students concurrently.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    storageState: ".playwright/teacher-session.json",
  },
  projects: [
    {
      name: "school",
      testMatch: "**/school.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3102",
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "desktop",
      testIgnore: [
        "**/google.spec.ts",
        "**/school.spec.ts",
        "**/account-settings.spec.ts",
        "**/password-recovery.spec.ts",
        "**/capacity.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "phone",
      testIgnore: [
        "**/google.spec.ts",
        "**/school.spec.ts",
        "**/account-settings.spec.ts",
        "**/password-recovery.spec.ts",
        "**/capacity.spec.ts",
      ],
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "live-capacity",
      testMatch: "**/capacity.spec.ts",
      dependencies: ["desktop", "phone", "google-provider"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "account-settings",
      testMatch: "**/account-settings.spec.ts",
      dependencies: ["desktop", "phone", "google-provider", "live-capacity"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "account-recovery",
      testMatch: "**/password-recovery.spec.ts",
      dependencies: ["account-settings"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "google-provider",
      testMatch: "**/google.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3101",
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  webServer: [
    {
      command:
        "bun scripts/prepare-e2e.ts school && bun run db:migrate:e2e-school && bun run dev --mode e2e-school --port 3102 --host 127.0.0.1",
      url: "http://127.0.0.1:3102",
      // Cold Workers/SSR compilation can exceed a minute on contributor laptops.
      timeout: 120_000,
      reuseExistingServer: false,
      env: { WRANGLER_LOG_PATH: "/tmp/funkwiz-school-playwright.log" },
    },
    {
      command:
        "bun scripts/prepare-e2e.ts && bun run db:migrate:e2e && bun run dev --mode e2e --port 3100 --host 127.0.0.1",
      url: "http://127.0.0.1:3100",
      // Cold Workers/SSR compilation can exceed a minute on contributor laptops.
      timeout: 120_000,
      reuseExistingServer: false,
      env: { WRANGLER_LOG_PATH: "/tmp/fun-quiz-playwright-wrangler.log" },
    },
    {
      command:
        "bun scripts/prepare-e2e.ts google && bun run db:migrate:e2e-google && bun run dev --mode e2e-google --port 3101 --host 127.0.0.1",
      url: "http://127.0.0.1:3101",
      // Cold Workers/SSR compilation can exceed a minute on contributor laptops.
      timeout: 120_000,
      reuseExistingServer: false,
      env: { WRANGLER_LOG_PATH: "/tmp/fun-quiz-google-playwright.log" },
    },
  ],
});
