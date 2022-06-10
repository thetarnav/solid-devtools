import { defineConfig } from "tsup"

export default defineConfig({
	clean: true,
	dts: "src/index.ts",
	format: ["cjs"],
	entryPoints: ["src/index.ts"],
})
