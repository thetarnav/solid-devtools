import { transformAsync } from "@babel/core"
import { Visitor } from "@babel/traverse"
import { PluginOption } from "vite"
import * as t from "@babel/types"
import { getLocationAttribute, isFileJSX, isLowercase } from "./utils"
import { LOCATION_ATTRIBUTE_NAME, WINDOW_PROJECTPATH_PROPERTY } from "@shared/variables"
import { relative } from "path"

// This is the entry point for babel.
export default (): {
	name: string
	visitor: Visitor
} => {
	return {
		name: "@solid-devtools/babel-plugin",
		visitor: {
			Program(path, state) {
				const { cwd, filename } = state as { cwd: unknown; filename: unknown }
				if (typeof cwd !== "string" || typeof filename !== "string") return

				// target only project files
				if (!filename.includes(cwd)) return

				// inject projectPath variable
				const body = path.node.body
				const windowIdentifier = t.identifier("window")
				const dataSourceLocIdentifier = t.identifier(WINDOW_PROJECTPATH_PROPERTY)
				const dataSourceLocMemberExpression = t.memberExpression(
					windowIdentifier,
					dataSourceLocIdentifier,
				)
				const cwdStringLiteral = t.stringLiteral(cwd)
				const assignmentExpression = t.assignmentExpression(
					"=",
					dataSourceLocMemberExpression,
					cwdStringLiteral,
				)
				body.splice(0, 0, t.toStatement(assignmentExpression))
			},
			JSXOpeningElement(path, state) {
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
								// 2 is added to place the caret after the "<" character
								location.start.column + 2,
							),
						),
					),
				)
			},
		},
	}
}

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
			// the plugin should only run on .tsx/.jsx files in development
			// production and server should be disabled
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
