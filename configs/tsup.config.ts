import { defineConfig } from "tsup"
import { Plugin } from "esbuild"
import { solidPlugin } from "esbuild-plugin-solid"

export default (
  extension: "tsx" | "ts" = "ts",
  server: boolean = false,
  additionalEntries: string[] = [],
  additionalPlugins: Plugin[] = [],
) => {
  const entry = `src/index.${extension}`
  const baseEntries = server ? [entry, `src/server.${extension}`] : [entry]
  const mappedAdditionalEntries = additionalEntries.map(entry => {
    if (entry.includes(".")) return `src/${entry}`
    return `src/${entry}.${extension}`
  })
  return defineConfig(config => ({
    clean: config.watch ? false : true,
    dts: {
      entry: [entry, ...mappedAdditionalEntries],
    },
    format: ["cjs", "esm"],
    entryPoints: [...baseEntries, ...mappedAdditionalEntries],
    // solidPlugin() returns an incompatible plugin type from 0.14.53 esbuild version
    esbuildPlugins:
      extension === "tsx" ? [solidPlugin() as any, ...additionalPlugins] : additionalPlugins,
  }))
}
