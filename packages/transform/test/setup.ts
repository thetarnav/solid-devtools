import { PluginObj, traverse } from '@babel/core'
import { parse } from '@babel/parser'
import generate from '@babel/generator'
import { expect } from 'vitest'

export const cwd = 'root/src'
export const file = 'test.tsx'
process.cwd = () => cwd

export function assertTransform(src: string, expectedOutput: string, ...plugins: PluginObj<any>[]) {
  const ast = parse(src, {
    sourceType: 'module',
    plugins: ['jsx'],
  })

  for (const plugin of plugins) {
    traverse(ast, plugin.visitor, undefined, { filename: `${cwd}/${file}` })
  }
  const res = generate(ast)

  expect(res.code).toBe(expectedOutput)
}
