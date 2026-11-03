import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const config = defineConfig(({ mode }) => ({
  ...(mode === "private" ? { build: { outDir: ".deploy/dist" } } : {}),
  ...(mode === "classroom" ? { build: { outDir: ".classroom/dist" } } : {}),
  // Concurrent dev/test servers must not overwrite each other's React chunks.
  cacheDir: `node_modules/.vite/${mode}`,
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  environments: {
    ssr: {
      optimizeDeps: {
        include: [
          "react",
          "react-dom",
          "react-dom/server",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
        ],
      },
    },
  },
  plugins: [
    devtools(),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      ...(mode === "private" ? { configPath: "./.deploy/wrangler.json" } : {}),
      ...(mode === "classroom"
        ? { configPath: "./.classroom/wrangler.json" }
        : {}),
      ...(mode.startsWith("e2e")
        ? {
            configPath:
              mode === "e2e-school"
                ? "./e2e/worker/school.jsonc"
                : mode === "e2e-google"
                  ? "./e2e/worker/google.jsonc"
                  : "./e2e/worker/wrangler.jsonc",
            persistState: {
              path:
                mode === "e2e-school"
                  ? ".wrangler/e2e-school-state"
                  : mode === "e2e-google"
                    ? ".wrangler/e2e-google-state"
                    : ".wrangler/e2e-state",
            },
            inspectorPort: false as const,
          }
        : {}),
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
}));

export default config;
