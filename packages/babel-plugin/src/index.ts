import { transformAsync } from "@babel/core"
import { relative } from "path"
import { Visitor } from "@babel/traverse"
import { PluginOption } from "vite"
import * as t from "@babel/types"
import { getLocationAttribute, isFileJSX, isLowercase } from "./utils"
import { LOCATION_ATTRIBUTE_NAME } from "@shared/variables"

export type ElementLocation = {
	path: string
	line: number
	column: number
}

// This is the entry point for babel.
export default (): {
	name: string
	visitor: Visitor
} => ({
	name: "@solid-devtools/babel-plugin",
	visitor: {
		JSXOpeningElement: (path, state) => {
			const container = path.container as t.JSXElement
			if (container.openingElement.name.type !== "JSXIdentifier") return
			const name = container.openingElement.name.name

			// Filter native elements
			if (!isLowercase(name)) return

			const location = container.openingElement.loc
			if (!location) return

			const { cwd, filename } = state as { cwd: unknown; filename: unknown }
			if (typeof cwd !== "string" || typeof filename !== "string") return

			container.openingElement.attributes.push(
				t.jsxAttribute(
					t.jsxIdentifier(LOCATION_ATTRIBUTE_NAME),
					t.stringLiteral(
						getLocationAttribute(filename, location.start.line, location.start.column),
					),
				),
			)
		},
	},
})

// This export is used for configuration.
export const devtoolsPlugin = (): PluginOption => {
	let enablePlugin = false
	let projectRoot = process.cwd()

	return {
		name: "solid-devtools",
		enforce: "pre",
		configResolved(config) {
			enablePlugin = config.command === "serve" && config.mode !== "production"
		},
		async transform(source, id, transformOptions) {
			if (transformOptions?.ssr || !enablePlugin || !isFileJSX(id)) return

			const result = await transformAsync(source, {
				babelrc: false,
				configFile: false,
				root: projectRoot,
				filename: id,
				sourceFileName: id,
				plugins: [
					["@babel/plugin-syntax-typescript", { isTSX: true }],
					"@solid-devtools/babel-plugin",
				],
			})
			if (!result) return null
			const { code } = result
			if (!code) return null
			return { code }
		},
	}
}
