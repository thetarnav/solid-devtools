import { defineConfig } from "tsup"

export default defineConfig({
	clean: true,
	format: ["cjs"],
	entryPoints: ["src/index.ts"],
})
