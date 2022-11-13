import p from 'path'
import { PluginObj, template } from '@babel/core'
import * as t from '@babel/types'
import { LocationAttr, LOCATION_ATTRIBUTE_NAME, WINDOW_PROJECTPATH_PROPERTY } from './types'

const cwd = process.cwd()

const projectPathAst = template(`globalThis.${WINDOW_PROJECTPATH_PROPERTY} = %%loc%%;`)({
  loc: t.stringLiteral(cwd),
}) as t.Statement
const importMarkComponentAst = template(
  `import { markComponentLoc as _$markComponentLoc } from "@solid-devtools/debugger"`,
)() as t.Statement
const buildMarkComponent = template(`_$markComponentLoc(%%loc%%);`) as (
  ...args: Parameters<ReturnType<typeof template>>
) => t.Statement

const isUpperCase = (s: string) => /^[A-Z]/.test(s)

const getLocationAttribute = (filePath: string, line: number, column: number): LocationAttr =>
  `${filePath}:${line}:${column}`

function getNodeLocationAttribute(node: t.Node, state: { filename?: unknown }): string | undefined {
  if (!node.loc || typeof state.filename !== 'string') return
  return getLocationAttribute(
    p.relative(cwd, state.filename),
    node.loc.start.line,
    // 2 is added to place the caret after the "<" character
    node.loc.start.column + 2,
  )
}

let importMarkComponent: VoidFunction | undefined

const jsxLocationPlugin: (config: {
  jsx: boolean
  components: boolean
}) => PluginObj<any> = config => ({
  name: '@solid-devtools/location',
  visitor: {
    Program(path, state) {
      importMarkComponent = undefined
      // target only project files
      if (typeof state.filename !== 'string' || !state.filename.includes(cwd)) return

      // inject projectPath variable
      path.node.body.push(projectPathAst)

      importMarkComponent = () => {
        importMarkComponent = undefined
        path.node.body.unshift(importMarkComponentAst)
      }
    },
    ...(config.jsx && {
      JSXOpeningElement(path, state) {
        const container = path.container as t.JSXElement
        if (container.openingElement.name.type !== 'JSXIdentifier') return

        // Filter native elements
        if (isUpperCase(container.openingElement.name.name)) return

        const location = getNodeLocationAttribute(container.openingElement, state)
        if (!location) return

        container.openingElement.attributes.push(
          t.jsxAttribute(t.jsxIdentifier(LOCATION_ATTRIBUTE_NAME), t.stringLiteral(location)),
        )
      },
    }),
    ...(config.components && {
      FunctionDeclaration(path, state) {
        if (!path.node.id || !isUpperCase(path.node.id.name)) return

        const location = getNodeLocationAttribute(path.node, state)
        if (!location) return

        path.node.body.body.unshift(buildMarkComponent({ loc: t.stringLiteral(location) }))
        importMarkComponent?.()
      },
      VariableDeclarator(path, state) {
        const { init, id } = path.node
        if (
          !id ||
          !('name' in id) ||
          !isUpperCase(id.name) ||
          !init ||
          (init.type !== 'FunctionExpression' && init.type !== 'ArrowFunctionExpression') ||
          init.body.type !== 'BlockStatement'
        )
          return

        const location = getNodeLocationAttribute(path.node, state)
        if (!location) return

        init.body.body.unshift(buildMarkComponent({ loc: t.stringLiteral(location) }))
        importMarkComponent?.()
      },
    }),
  },
})

export default jsxLocationPlugin
