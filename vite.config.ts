import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const config = defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      ...(mode.startsWith("e2e")
        ? {
            configPath:
              mode === "e2e-google"
                ? "./e2e/worker/google.jsonc"
                : "./e2e/worker/wrangler.jsonc",
            persistState: {
              path:
                mode === "e2e-google"
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
