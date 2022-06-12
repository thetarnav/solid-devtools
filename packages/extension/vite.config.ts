import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"

import manifest from "./manifest"
import path from "path"

export default defineConfig({
	plugins: [solidPlugin({ hot: false }), crx({ manifest })],
	resolve: {
		alias: {
			"@shared": path.resolve(__dirname, "..", "shared"),
			"@solid-devtools/ui": path.resolve(__dirname, "..", "ui", "src"),
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
