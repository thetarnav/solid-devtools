import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import manifest from "./manifest"

export default defineConfig({
  plugins: [solidPlugin(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        panel: "src/index.html",
      },
    },
    target: "esnext",
    polyfillDynamicImport: false,
  },
  optimizeDeps: {
    entries: ["src/**/*.html"],
  },
})
