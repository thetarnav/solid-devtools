import { defineConfig, PluginOption } from "vite"
import solidPlugin from "vite-plugin-solid"
import { devtoolsPlugin } from "@solid-devtools/babel-plugin"
import path from "path"

const pathToPackages = path.resolve(__dirname, "..", "..", "packages")

export default defineConfig({
	plugins: [devtoolsPlugin(), solidPlugin() as PluginOption],
	resolve: {
		alias: {
			// used inside packages/debugger
			"@shared": path.resolve(pathToPackages, "shared"),
			"solid-devtools": path.resolve(pathToPackages, "main", "src"),
			"@solid-devtools/debugger": path.resolve(pathToPackages, "debugger", "src"),
			"@solid-devtools/logger": path.resolve(pathToPackages, "logger", "src"),
			"@solid-devtools/ui": path.resolve(pathToPackages, "ui", "src"),
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
