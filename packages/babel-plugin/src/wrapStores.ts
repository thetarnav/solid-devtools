import { PluginObj } from "@babel/core"
import * as t from "@babel/types"
import { windowId } from "./utils"

const createStoreId = t.identifier("createStore")
const overwriteName = "$sdt_createStore"
const overwriteNamespaceName = "$sdt_StoreNamespace"
const sdtCreateStoreId = t.identifier(overwriteName)
const overwriteNamespaceNameId = t.identifier(overwriteNamespaceName)

/*
Store.createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return $sdt_createStore(wrappedObj, options);
};
*/

function getStoreWrapperArrowFn(): t.ArrowFunctionExpression {
	const objId = t.identifier("obj")
	const optionsId = t.identifier("options")
	const wrappedObjId = t.identifier("wrappedObj")
	const wrapStoreId = t.identifier("$sdt_wrapStore")
	const wrapStoreMember = t.memberExpression(windowId, wrapStoreId)

	return t.arrowFunctionExpression(
		[objId, optionsId],
		t.blockStatement([
			t.variableDeclaration("let", [t.variableDeclarator(wrappedObjId, objId)]),
			t.ifStatement(
				t.binaryExpression(
					"===",
					t.unaryExpression("typeof", wrapStoreMember),
					t.stringLiteral("function"),
				),
				t.blockStatement([
					t.toStatement(
						t.assignmentExpression("=", wrappedObjId, t.callExpression(wrapStoreMember, [objId])),
					),
				]),
			),
			t.returnStatement(t.callExpression(sdtCreateStoreId, [wrappedObjId, optionsId])),
		]),
	)
}

/**
 * TODO:
 *
 * cover all import syntaxes
 * - [x] import { createStore } from "solid-js/store"
 * - [x] import { createStore as something } from "solid-js/store"
 * - [x] import * as Store from "solid-js/store"
 *
 * cover all primitives
 * - [x] createStore
 * - [ ] createMutable
 */

const wrapStoresPlugin: PluginObj<any> = {
	name: "@solid-devtools/wrap-stores",
	visitor: {
		Program(path) {
			const body = path.node.body

			for (let importIndex = 0; importIndex < body.length; importIndex++) {
				const node = body[importIndex]
				if (node.type !== "ImportDeclaration" || node.source.value !== "solid-js/store") continue

				for (const s of node.specifiers) {
					if (s.type === "ImportNamespaceSpecifier") {
						const namespace = s.local.name
						const namespaceId = t.identifier(namespace)
						s.local.name = overwriteNamespaceName

						const original = t.variableDeclaration("const", [
							t.variableDeclarator(
								sdtCreateStoreId,
								t.memberExpression(overwriteNamespaceNameId, createStoreId),
							),
						])
						const overwriteNamespace = t.variableDeclaration("const", [
							t.variableDeclarator(
								namespaceId,
								t.objectExpression([t.spreadElement(overwriteNamespaceNameId)]),
							),
						])
						const overwrite = t.expressionStatement(
							t.assignmentExpression(
								"=",
								t.memberExpression(namespaceId, createStoreId),
								getStoreWrapperArrowFn(),
							),
						)

						body.splice(importIndex + 1, 0, original, overwriteNamespace, overwrite)
						return
					}
					if (
						s.type === "ImportSpecifier" &&
						(t.isIdentifier(s.imported)
							? s.imported.name === "createStore"
							: s.imported.value === "createStore")
					) {
						const userName = s.local.name
						s.local.name = overwriteName

						const overwrite = t.variableDeclaration("const", [
							t.variableDeclarator(t.identifier(userName), getStoreWrapperArrowFn()),
						])

						body.splice(importIndex + 1, 0, overwrite)
						return
					}
				}
			}
		},
	},
}

export default wrapStoresPlugin
