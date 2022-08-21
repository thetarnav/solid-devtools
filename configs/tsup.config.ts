import { defineConfig, Options } from "tsup"
import { Plugin } from "esbuild"
import { solidPlugin } from "esbuild-plugin-solid"

export default ({
  extension = "ts",
  server = false,
  additionalEntries = [],
  additionalPlugins = [],
  overwrite,
}: {
  extension?: "tsx" | "ts"
  server?: boolean
  additionalEntries?: string[]
  additionalPlugins?: Plugin[]
  overwrite?: (overrideOptions: Options) => Options
} = {}) => {
  const entry = `src/index.${extension}`
  const baseEntries = server ? [entry, `src/server.${extension}`] : [entry]
  const mappedAdditionalEntries = additionalEntries.map(entry => {
    if (entry.includes(".")) return `src/${entry}`
    return `src/${entry}.${extension}`
  })
  return defineConfig(config => {
    const options: Options = {
      clean: config.watch ? false : true,
      dts: {
        entry: [entry, ...mappedAdditionalEntries],
      },
      format: ["cjs", "esm"],
      entryPoints: [...baseEntries, ...mappedAdditionalEntries],
      // solidPlugin() returns an incompatible plugin type from 0.14.53 esbuild version
      esbuildPlugins:
        extension === "tsx" ? [solidPlugin() as any, ...additionalPlugins] : additionalPlugins,
    }
    return overwrite ? overwrite(options) : options
  })
}
