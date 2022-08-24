import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin"

import manifest from "./manifest"
import pkg from "./package.json"

export default defineConfig({
  plugins: [solidPlugin({ hot: false }), vanillaExtractPlugin(), crx({ manifest })],
  resolve: {
    alias: {
      // "@solid-devtools/shared": resolve(__dirname, "..", "shared", "src"),
      // "@solid-devtools/ui": path.resolve(__dirname, "..", "ui", "src"),
    },
  },
  // optimizeDeps: {
  //   include: ["@solid-primitives/props"],
  // },
  define: {
    // need to insert the "" quotes manually, because vite just inserts the value as-is.
    __ADAPTER_VERSION__: `"${
      pkg.devDependencies["@solid-devtools/ext-adapter"].match(/\d+.\d+.\d+/)![0]
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
})
