import { relative } from "path"
import { Visitor, NodePath } from "@babel/traverse"
// import t from "@babel/types"

// function isReactImportOrRequire(path: NodePath) {
// 	if (path.parentPath.type === "ImportDeclaration")
// 		return path.parentPath.node.source.value === "react"
// 	else if (path.node.type === "VariableDeclarator") {
// 		const { init } = path.node
// 		return (
// 			init.type === "CallExpression" &&
// 			init.callee.type === "Identifier" &&
// 			init.callee.name === "require" &&
// 			init.arguments[0] &&
// 			init.arguments[0].type === "StringLiteral" &&
// 			init.arguments[0].value === "react"
// 		)
// 	}
// }

// function isReactFragment(path: NodePath) {
// 	const { node } = path
// 	if (
// 		node.type === "JSXMemberExpression" &&
// 		node.property.type === "JSXIdentifier" &&
// 		node.property.name === "Fragment" &&
// 		node.object.type === "JSXIdentifier"
// 	) {
// 		if (node.object.name === "React") return true
// 		const binding = path.scope.getBinding(node.object.name)
// 		const boundPath = binding ? binding.path : null
// 		if (!boundPath) return false
// 		return isReactImportOrRequire(boundPath)
// 	} else if (node.type === "JSXIdentifier" && node.name === "Fragment") {
// 		const binding = path.scope.getBinding(node.name)
// 		const boundPath = binding ? binding.path : null
// 		if (!boundPath) return false
// 		return isReactImportOrRequire(boundPath)
// 	}
// }

export default function transformComponents(app: any): {
	name: string
	visitor: Visitor
} {
	console.log(app)

	const DATA_SOURCE_LOCATION = "data-source-loc"

	return {
		name: "jsx-source-loc",
		visitor: {
			JSXOpeningElement: (path, state) => {
				console.log(path, state)

				// if (isReactFragment(path.get("name"))) return

				// const location = path.container.openingElement.loc
				// if (!location) {
				// 	// the element was generated and doesn't have location information
				// 	return
				// }

				// const attributes = path.container.openingElement.attributes
				// for (let i = 0; i < attributes.length; i++) {
				// 	const name = attributes[i].name
				// 	if (name && name === DATA_SOURCE_LOCATION) {
				// 		// The attribute already exists
				// 		return
				// 	}
				// }

				// attributes.push(
				// 	t.jsxAttribute(
				// 		t.jsxIdentifier(DATA_SOURCE_LOCATION),
				// 		t.stringLiteral(
				// 			relative(state.cwd || "", state.filename || "") +
				// 				":" +
				// 				location.start.line +
				// 				":" +
				// 				location.start.column,
				// 		),
				// 	),
				// )
			},
		},
	}
}
