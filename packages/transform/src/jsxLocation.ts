import { relative } from 'path'
import { PluginObj } from '@babel/core'
import * as t from '@babel/types'
import {
  LOCATION_ATTRIBUTE_NAME,
  WINDOW_PROJECTPATH_PROPERTY,
} from '@solid-devtools/shared/variables'
import { getLocationAttribute, isLowercase, windowId } from './utils'

const jsxLocationPlugin: PluginObj<any> = {
  name: '@solid-devtools/jsx-location',
  visitor: {
    Program(path, state) {
      const { cwd, filename } = state as { cwd: unknown; filename: unknown }
      if (typeof cwd !== 'string' || typeof filename !== 'string') return

      // target only project files
      if (!filename.includes(cwd)) return

      // inject projectPath variable
      const body = path.node.body

      const dataSourceLocId = t.identifier(WINDOW_PROJECTPATH_PROPERTY)
      const dataSourceLocMemberExpression = t.memberExpression(windowId, dataSourceLocId)
      const cwdStringLiteral = t.stringLiteral(cwd)
      const assignmentExpression = t.assignmentExpression(
        '=',
        dataSourceLocMemberExpression,
        cwdStringLiteral,
      )
      body.splice(0, 0, t.toStatement(assignmentExpression))
    },
    JSXOpeningElement(path, state) {
      const container = path.container as t.JSXElement
      if (container.openingElement.name.type !== 'JSXIdentifier') return
      const name = container.openingElement.name.name

      // Filter native elements
      if (!isLowercase(name)) return

      const location = container.openingElement.loc
      if (!location) return

      const { cwd, filename } = state as { cwd: unknown; filename: unknown }
      if (typeof cwd !== 'string' || typeof filename !== 'string') return

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

export default jsxLocationPlugin
