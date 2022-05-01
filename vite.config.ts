import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import manifest from "./manifest.json"
import { version } from "./package.json"

export default defineConfig({
  plugins: [solidPlugin(), crx({ manifest: { ...manifest, version } })],
  build: {
    rollupOptions: {
      input: {
        panel: "src/index.html",
      },
    },
    target: "esnext",
    polyfillDynamicImport: false,
  },
})
