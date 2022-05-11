import { defineConfig } from "tsup"
import { solidPlugin } from "esbuild-plugin-solid"

export default defineConfig({
	clean: true,
	dts: "src/index.tsx",
	format: ["esm", "cjs"],
	entryPoints: ["src/index.tsx"],
	esbuildPlugins: [solidPlugin()],
})
