import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
// import { chromeExtension } from "vite-plugin-chrome-extension"
import { crx } from "@crxjs/vite-plugin"
import manifest from "./manifest.json"

export default defineConfig({
  plugins: [
    solidPlugin(),
    // chromeExtension(),
    crx({ manifest }),
  ],
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
