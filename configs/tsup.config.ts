import { defineConfig } from "tsup"
import { solidPlugin } from "esbuild-plugin-solid"

export default (
	extension: "tsx" | "ts" = "ts",
	target: ("cjs" | "esm")[] | "cjs" | "esm" = ["cjs", "esm"],
) => {
	const entry = `src/index.${extension}`
	return defineConfig({
		clean: true,
		dts: entry,
		format: Array.isArray(target) ? target : [target],
		entryPoints: [entry],
		esbuildPlugins: extension === "tsx" ? [solidPlugin()] : undefined,
	})
}
