import { PluginObj } from "@babel/core"
import * as t from "@babel/types"
import { WINDOW_WRAP_STORE_PROPERTY } from "@shared/variables"
import { storeOverwriteName, storeOverwriteNamespace, windowId } from "./utils"

const createStoreId = t.identifier("createStore")
const createMutableId = t.identifier("createMutable")

/*
Store.createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return $sdt_createStore(wrappedObj, options);
};
*/

function getStoreWrapperArrowFn(overwrite: t.Identifier): t.ArrowFunctionExpression {
  const objId = t.identifier("obj")
  const optionsId = t.identifier("options")
  const wrappedObjId = t.identifier("wrappedObj")
  const wrapStoreId = t.identifier(WINDOW_WRAP_STORE_PROPERTY)
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
      t.returnStatement(t.callExpression(overwrite, [wrappedObjId, optionsId])),
    ]),
  )
}

const wrapStoresPlugin: PluginObj<any> = {
  name: "@solid-devtools/wrap-stores",
  visitor: {
    Program(path) {
      const body = path.node.body
      let IdSuffix = 0

      for (let line = 0; line < body.length; line++) {
        const node = body[line]
        if (node.type !== "ImportDeclaration" || node.source.value !== "solid-js/store") continue

        for (const s of node.specifiers) {
          // import * as Store from "solid-js/store"
          if (s.type === "ImportNamespaceSpecifier") {
            const namespaceId = t.identifier(s.local.name)
            s.local.name = storeOverwriteNamespace

            const overwriteStoreId = t.identifier(`${storeOverwriteName}${IdSuffix++}`)
            const overwriteMutableId = t.identifier(`${storeOverwriteName}${IdSuffix++}`)
            const originalStore = t.variableDeclaration("const", [
              t.variableDeclarator(
                overwriteStoreId,
                t.memberExpression(t.identifier(storeOverwriteNamespace), createStoreId),
              ),
            ])
            const originalMutable = t.variableDeclaration("const", [
              t.variableDeclarator(
                overwriteMutableId,
                t.memberExpression(t.identifier(storeOverwriteNamespace), createMutableId),
              ),
            ])
            const overwriteNamespace = t.variableDeclaration("const", [
              t.variableDeclarator(
                namespaceId,
                t.objectExpression([t.spreadElement(t.identifier(storeOverwriteNamespace))]),
              ),
            ])
            const overwriteStore = t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(namespaceId, createStoreId),
                getStoreWrapperArrowFn(overwriteStoreId),
              ),
            )
            const overwriteMutable = t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(namespaceId, createMutableId),
                getStoreWrapperArrowFn(overwriteMutableId),
              ),
            )

            // insert after import statement
            body.splice(
              line + 1,
              0,
              originalStore,
              originalMutable,
              overwriteNamespace,
              overwriteStore,
              overwriteMutable,
            )
            line += 5
          }
          // import { createStore } from "solid-js/store"
          // import { createStore as userName } from "solid-js/store"
          let primitive: "createStore" | "createMutable"
          if (
            s.type === "ImportSpecifier" &&
            ([(s.imported as t.Identifier).name, (s.imported as t.StringLiteral).value].includes(
              (primitive = "createStore"),
            ) ||
              [(s.imported as t.Identifier).name, (s.imported as t.StringLiteral).value].includes(
                (primitive = "createMutable"),
              ))
          ) {
            const userName = s.local.name
            const overwriteName = `${storeOverwriteName}${IdSuffix++}`
            s.local.name = overwriteName

            const overwrite = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(userName),
                getStoreWrapperArrowFn(t.identifier(overwriteName)),
              ),
            ])

            // insert after import statement
            body.splice(++line, 0, overwrite)
          }
        }
      }
    },
  },
}

export default wrapStoresPlugin
