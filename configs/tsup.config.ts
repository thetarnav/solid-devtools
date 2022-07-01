import { defineConfig } from "tsup"
import { solidPlugin } from "esbuild-plugin-solid"

export default (
	extension: "tsx" | "ts" = "ts",
	target: ("cjs" | "esm")[] | "cjs" | "esm" = ["cjs", "esm"],
	server: boolean = false,
	additionalEntries: string[] = [],
) => {
	const entry = `src/index.${extension}`
	const baseEntries = server ? [entry, `src/server.${extension}`] : [entry]
	const mappedAdditionalEntries = additionalEntries.map(entry => `src/${entry}.${extension}`)
	return defineConfig({
		clean: true,
		dts: {
			entry: [entry, ...mappedAdditionalEntries],
		},
		format: Array.isArray(target) ? target : [target],
		entryPoints: [...baseEntries, ...mappedAdditionalEntries],
		esbuildPlugins: extension === "tsx" ? [solidPlugin()] : undefined,
	})
}
