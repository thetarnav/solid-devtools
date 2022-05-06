import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { crx } from "@crxjs/vite-plugin"
import manifest from "./manifest"
import path from "path"

export default defineConfig({
	plugins: [solidPlugin(), crx({ manifest })],
	resolve: {
		alias: {
			"@shared": path.resolve(__dirname, "..", "shared"),
			"@": path.resolve(__dirname, "."),
		},
	},
	build: {
		rollupOptions: {
			input: {
				panel: "panel/index.html",
			},
		},
		target: "esnext",
		polyfillDynamicImport: false,
	},
	optimizeDeps: {
		entries: ["**/*.html"],
	},
})
