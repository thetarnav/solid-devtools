import { relative } from "path"
import { Visitor } from "@babel/traverse"
import { PluginOption } from "vite"
import { babel } from "@rollup/plugin-babel"
import * as t from "@babel/types"
import { getLocationAttribute, isLowercase } from "./utils"

export { getLocationFromAttribute } from "./utils"

export const LOCATION_ATTRIBUTE_NAME = "data-source-loc"

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
						getLocationAttribute(
							relative(cwd, filename),
							location.start.line,
							location.start.column,
						),
					),
				),
			)
		},
	},
})

// This export is used for configuration.
export const devtoolsPlugin = (): PluginOption => {
	return {
		...babel({
			plugins: [
				["@babel/plugin-syntax-typescript", { isTSX: true }],
				"@solid-devtools/babel-plugin",
			],
			extensions: [".tsx"],
		}),
		enforce: "pre",
	}
}
