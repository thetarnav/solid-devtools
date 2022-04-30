import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { chromeExtension } from "vite-plugin-chrome-extension"

export default defineConfig({
  plugins: [solidPlugin(), chromeExtension()],
  build: {
    rollupOptions: {
      input: "src/manifest.json",
    },
    target: "esnext",
    polyfillDynamicImport: false,
  },
})
