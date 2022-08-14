import { defineConfig } from "tsup"

const entries = ["cursor", "bridge", "diff", "graph", "solid", "utils", "variables"] as const
const entryPaths = entries.map(entry => `src/${entry}.ts`)

export default defineConfig(config => ({
  clean: config.watch ? false : true,
  dts: { entry: entryPaths },
  format: ["cjs", "esm"],
  entryPoints: entryPaths,
}))
