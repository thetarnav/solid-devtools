import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import unoCSS from "@unocss/vite"

import unoConfig from "../../uno.config"
import manifest from "./manifest"
import path from "path"

export default defineConfig({
	plugins: [solidPlugin(), crx({ manifest }), unoCSS(unoConfig)],
	resolve: {
		alias: {
			"@shared": path.resolve(__dirname, "..", "shared"),
			"@ui": path.resolve(__dirname, "..", "ui", "src"),
		},
	},
	build: {
		rollupOptions: {
			input: {
				panel: "src/index.html",
			},
		},
		target: "esnext",
		polyfillDynamicImport: false,
	},
	optimizeDeps: {
		entries: ["**/*.html"],
	},
})
