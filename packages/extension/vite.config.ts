import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin"

import manifest from "./manifest"
import path from "path"

export default defineConfig({
  plugins: [solidPlugin(), vanillaExtractPlugin(), crx({ manifest })],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "..", "shared"),
      // "@solid-devtools/ui": path.resolve(__dirname, "..", "ui", "src"),
    },
  },
  // optimizeDeps: {
  //   include: ["@solid-primitives/props"],
  // },
  build: {
    rollupOptions: {
      input: {
        panel: "index.html",
      },
    },
    target: "esnext",
  },
})
