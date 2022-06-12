import { defineConfig } from "tsup"
import { solidPlugin } from "esbuild-plugin-solid"

export default (
	extension: "tsx" | "ts" = "ts",
	target: ("cjs" | "esm")[] | "cjs" | "esm" = ["cjs", "esm"],
	server: boolean = false,
) => {
	const entry = `src/index.${extension}`
	return defineConfig({
		clean: true,
		dts: entry,
		format: Array.isArray(target) ? target : [target],
		entryPoints: server ? [entry, `src/server.${extension}`] : [entry],
		esbuildPlugins: extension === "tsx" ? [solidPlugin()] : undefined,
	})
}
