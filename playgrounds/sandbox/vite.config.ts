import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import unoCSS from "@unocss/vite"
import path from "path"

import unoConfig from "../../uno.config"

export default defineConfig({
	plugins: [solidPlugin(), unoCSS(unoConfig)],
	resolve: {
		alias: {
			// used inside packages/library
			"@shared": path.resolve(__dirname, "..", "..", "packages", "shared"),
		},
	},
	build: {
		target: "esnext",
		polyfillDynamicImport: false,
	},
})
