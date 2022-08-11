import { PluginObj, traverse } from "@babel/core"
import { parse } from "@babel/parser"
import generate from "@babel/generator"

export function assertTransform(src: string, expectedOutput: string, plugin: PluginObj<any>) {
  const ast = parse(src, {
    sourceType: "module",
    plugins: ["jsx"],
  })

  traverse(ast, plugin.visitor)
  const res = generate(ast)

  expect(res.code).toBe(expectedOutput)
}
