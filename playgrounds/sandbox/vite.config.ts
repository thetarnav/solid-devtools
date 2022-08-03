import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import devtoolsPlugin from "@solid-devtools/transform"
import path from "path"

const pathToPackages = path.resolve(__dirname, "..", "..", "packages")
const resolvePackage = (...filepath: string[]) => path.resolve(pathToPackages, ...filepath)

export default defineConfig({
  plugins: [
    devtoolsPlugin({
      wrapStores: true,
    }),
    solidPlugin(),
  ],
  resolve: {
    alias: {
      // used inside packages/debugger
      "@shared": resolvePackage("shared"),
      "solid-devtools": resolvePackage("main", "src"),
      "@solid-devtools/debugger": resolvePackage("debugger", "src"),
      "@solid-devtools/logger": resolvePackage("logger", "src"),
      "@solid-devtools/ui": resolvePackage("ui", "src"),
      "@solid-devtools/locator": resolvePackage("locator", "src"),
      "@solid-devtools/extension-adapter": resolvePackage("extension-adapter", "src"),
    },
  },
  build: {
    target: "esnext",
  },
})
