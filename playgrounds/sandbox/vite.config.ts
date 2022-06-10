import { defineConfig, PluginOption } from "vite"
import solidPlugin from "vite-plugin-solid"
import path from "path"

const pathToPackages = path.resolve(__dirname, "..", "..", "packages")

export default defineConfig({
	plugins: [
		solidPlugin({
			babel: {
				plugins: ["@solid-devtools/babel-plugin"],
			},
		}) as PluginOption,
	],
	resolve: {
		alias: {
			// used inside packages/debugger
			"@shared": path.resolve(pathToPackages, "shared"),
			"@ui": path.resolve(pathToPackages, "ui", "src"),
			"@solid-devtools/locator": path.resolve(pathToPackages, "locator", "src"),
			"@solid-devtools/extension-adapter": path.resolve(pathToPackages, "extension-adapter", "src"),
		},
	},
	build: {
		target: "esnext",
		polyfillDynamicImport: false,
	},
	optimizeDeps: {
		exclude: ["@solid-devtools/babel-plugin"],
	},
})
