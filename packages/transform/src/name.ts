import { PluginObj } from "@babel/core"
import * as t from "@babel/types"

const nameId = t.identifier("name")

type Comparable = t.Identifier | t.V8IntrinsicIdentifier |
                  t.PrivateName | t.Expression
function equal(a: Comparable, b: Comparable): boolean {
  if (a.type !== b.type) return false
  switch (a.type) {
    case "Identifier":
    case "V8IntrinsicIdentifier":
      return a.name === (b as t.Identifier).name
    case "PrivateName":
      return a.id === (b as t.PrivateName).id
    case "MemberExpression":
      return equal(a.object, (b as t.MemberExpression).object) &&
             equal(a.property, (b as t.MemberExpression).property)
    default: // other type of Expression
      return false
  }
}

type Source = "createSignal" | "createStore" | "createMutable"

let sources: Record<Source, Comparable[]>

const namePlugin: PluginObj<any> = {
  name: "@solid-devtools/name",
  visitor: {
    Program() {
      sources = {
        createSignal: [],
        createStore: [],
        createMutable: [],
      }
    },

    // Track imported references to createSignal, createStore, createMutable
    ImportDeclaration(path) {
      const node = path.node
      const source = node.source.value
      let targets: Source[]
      switch (source) {
        case "solid-js":
          targets = ["createSignal"];
          break;
        case "solid-js/store":
          targets = ["createStore", "createMutable"];
          break;
        default:
          return;
      }
      for (const s of node.specifiers) {
        switch (s.type) {
          // import * as local from "solid-js"
          case "ImportNamespaceSpecifier":
            for (let target of targets) {
              sources[target].push(
                t.memberExpression(s.local, t.identifier(target))
              )
            }
            break
          // import { createSignal } from "solid-js"
          // import { createSignal as local } from "solid-js"
          // import { "createSignal" as local } from "solid-js"
          case "ImportSpecifier":
            let target: Source
            switch (s.imported.type) {
              case "Identifier":
                if (!targets.includes(s.imported.name)) continue
                target = s.imported.name as Source
                break
              case "StringLiteral":
                if (!targets.includes(s.imported.value)) continue
                target = s.imported.value as Source
                break
              default:
                continue
            }
            sources[target].push(s.local)
            break
        }
      }
    },

    VariableDeclaration(path) {
      const declarations = path.node.declarations
      for (let declaration of declarations) {
        // Check initializer is a call to createSignal/createStore/createMutable
        const init = declaration.init
        if (!init) continue
        if (init.type !== "CallExpression") continue
        if (!Object.entries(sources).some(([, sources]) =>
          (sources as Comparable[]).some(source =>
            equal(init.callee, source)
          )
        )) continue

        // Check declaration is either identifier or [identifier, ...]
        const id = declaration.id
        let name
        switch (id.type) {
          case "Identifier":
            name = id.name
            break
          case "ArrayPattern":
            if (!id.elements.length) continue
            const first = id.elements[0]
            if (!first) continue
            if (first.type !== "Identifier") continue
            name = first.name
            break
          default:
            continue
        }

        // Modify call to include name in options
        const nameProperty = t.objectProperty(nameId, t.stringLiteral(name))
        switch (init.arguments.length) {
          case 0:
            init.arguments.push(t.identifier("undefined"))
            // now 1 argument, fall through to case 1:
          case 1:
            init.arguments.push(t.objectExpression([nameProperty]))
            break
          default: // 2 or more arguments
            const second = init.arguments[1]
            if (second.type !== "ObjectExpression") continue
            // Check there isn't already a "name" property
            if (second.properties.some((property) =>
              property.type === "ObjectProperty" &&
              property.key.type === "Identifier" &&
              property.key.name === nameId.name)) continue
            if (second.type !== "ObjectExpression") continue
            second.properties.unshift(nameProperty)
            break
        }
      }
    },
  },
}

export default namePlugin
