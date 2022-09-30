import { defineConfig } from "vitest/config"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin"
import { resolve } from "path"

import vitestConfig from "../../configs/vitest.config"
import manifest from "./manifest"
import pkg from "./package.json"

export default defineConfig({
  plugins: [solidPlugin(), vanillaExtractPlugin(), crx({ manifest })],
  resolve: {
    alias: {
      "@/": `${__dirname}/src/`,
      "@solid-devtools/shared": resolve(__dirname, "..", "shared", "src"),
    },
  },
  define: {
    // need to insert the "" quotes manually, because vite just inserts the value as-is.
    __CLIENT_VERSION__: `"${
      pkg.devDependencies["@solid-devtools/ext-client"].match(/\d+.\d+.\d+/)![0]
    }"`,
  },
  build: {
    rollupOptions: {
      input: {
        panel: "index.html",
      },
    },
    target: "esnext",
  },
  ...vitestConfig,
})
