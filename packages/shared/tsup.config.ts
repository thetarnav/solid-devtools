import { defineConfig } from "tsup"
import pkq from "./package.json"

const entryPaths = Object.keys(pkq.exports).map(path => `src/${path.substring(2)}.ts`)

export default defineConfig(config => ({
  clean: config.watch ? false : true,
  dts: { entry: entryPaths },
  format: ["cjs", "esm"],
  entryPoints: entryPaths,
}))
