import { PluginItem, transformAsync } from "@babel/core"
import { PluginOption } from "vite"
import { getFileExtension } from "./utils"
import jsxLocationPlugin from "./jsxLocation"
import wrapStoresPlugin from "./wrapStores"

export interface DevtoolsPluginOptions {
	wrapStores?: boolean
	jsxLocation?: boolean
}

// This export is used for configuration.
export const devtoolsPlugin = (options: DevtoolsPluginOptions = {}): PluginOption => {
	const { wrapStores = false, jsxLocation = false } = options

	let enablePlugin = false
	let projectRoot = process.cwd()

	return {
		name: "solid-devtools",
		enforce: "pre",
		configResolved(config) {
			enablePlugin = config.command === "serve" && config.mode !== "production"
		},
		async transform(source, id, transformOptions) {
			// production and server should be disabled
			if (transformOptions?.ssr || !enablePlugin) return

			const extension = getFileExtension(id)

			if (!["js", "jsx", "ts", "tsx"].includes(extension)) return

			const isJSX = extension === "jsx" || extension === "tsx"
			const plugins: PluginItem[] = []

			// plugins that should only run on .tsx/.jsx files in development
			if (jsxLocation && isJSX) plugins.push(jsxLocationPlugin)
			if (wrapStores) plugins.push(wrapStoresPlugin)

			if (plugins.length === 0) return

			// babel doesn't work with typescript by default
			plugins.splice(0, 0, ["@babel/plugin-syntax-typescript", { isTSX: isJSX }])

			const result = await transformAsync(source, {
				babelrc: false,
				configFile: false,
				root: projectRoot,
				filename: id,
				sourceFileName: id,
				plugins,
			})

			if (!result) return null
			const { code } = result
			if (!code) return null
			return { code }
		},
	}
}
