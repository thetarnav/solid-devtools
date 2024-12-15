import * as babel     from '@babel/core'
import * as generator from '@babel/generator'
import * as parser    from '@babel/parser'
import * as test      from 'vitest'

const cwd  = 'root/src'
const file = 'test.tsx'
process.cwd = () => cwd

import * as debug  from '@solid-devtools/debugger/types'
import * as plugin from './babel.ts'


const removeExtraSpaces = (str: string): string => {
    return str.replace(/ {2,}/g, ' ').replace(/[\t\n] ?/g, '')
}

function assertTransform(
    src: string,
    expected: string,
    plugin: babel.PluginObj<any>,
    trim = false,
): void {
    const ast = parser.parse(src, {
        sourceType: 'module',
        plugins: ['jsx'],
    })

    babel.traverse(ast, plugin.visitor, undefined, {filename: `${cwd}/${file}`})
    const res = new generator.CodeGenerator(ast).generate()
    const output = trim ? removeExtraSpaces(res.code) : res.code
    const expectedOutput = trim ? removeExtraSpaces(expected) : expected

    test.expect(output).toBe(expectedOutput)
}

function testTransform(
    name: string,
    src: string,
    expected: string,
    plugin: babel.PluginObj<any>,
    trim = false,
): void {
    test.test(name, () => {
        assertTransform(src, expected, plugin, trim)
    })
}


const setLocationImport = `import { ${plugin.SET_COMPONENT_LOC} as ${plugin.SET_COMPONENT_LOC_LOCAL} } from "${plugin.DevtoolsModule.Setup}";`

test.describe('location', () => {
    const testData: [
        name: string,
        src: string,
        expected: string,
        options: plugin.JsxLocationPluginConfig,
    ][] = [
        [
            'function component',
            `function Button(props) {
  return <button>Click me</button>
}`,
            `${setLocationImport}
function Button(props) {
  ${plugin.SET_COMPONENT_LOC_LOCAL}("${file}:1:0");
  return <button>Click me</button>;
}
globalThis.${debug.WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
            {jsx: false, components: true},
        ],
        [
            'arrow component',
            `const Button = props => {
  return <button>Click me</button>
}`,
            `${setLocationImport}
const Button = props => {
  ${plugin.SET_COMPONENT_LOC_LOCAL}("${file}:1:6");
  return <button>Click me</button>;
};
globalThis.${debug.WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
            {jsx: false, components: true},
        ],
        [
            'jsx',
            `function Button(props) {
  return <button>Click me</button>
}`,
            `function Button(props) {
  return <button ${debug.LOCATION_ATTRIBUTE_NAME}="${file}:2:11">Click me</button>;
}
globalThis.${debug.WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
            {jsx: true, components: false},
        ],
    ]

    testData.forEach(([name, src, expected, options]) => {
        test.test(name, () => {
            assertTransform(src, expected, plugin.jsxLocationPlugin(options))
        })
    })
})


test.describe('returning primitives', () => {
    // Positive tests
    for (const [create, module, addExtraArg] of [
        ['createSignal', 'solid-js'],
        ['createMemo', 'solid-js', '1'],
        ['createStore', 'solid-js/store'],
        ['createMutable', 'solid-js/store'],
    ] as const) {
        const extraArg = addExtraArg ? 'undefined, ' : ''
        test.describe(create, () => {
            for (const [type, importStatement, creator] of [
                ['named import', `import { ${create} } from "${module}";`, create],
                ['renamed import', `import { ${create} as foo } from "${module}";`, 'foo'],
                ['namespace import', `import * as foo from "${module}";`, `foo.${create}`],
            ] as const) {
                test.describe(type, () => {
                    testTransform(
                        'no default value',
                        `${importStatement}
    const signal = ${creator}();`,
                        `${importStatement}
  const signal = ${creator}(undefined, ${extraArg}{
    name: "signal"
  });`,
                        plugin.namePlugin,
                        true,
                    )

                    testTransform(
                        'default value',
                        `${importStatement}
  const signal = ${creator}(5);`,
                        `${importStatement}
  const signal = ${creator}(5, ${extraArg}{
    name: "signal"
  });`,
                        plugin.namePlugin,
                        true,
                    )

                    testTransform(
                        'empty options',
                        `${importStatement}
          const rest = {};
          const signal = ${creator}(5, ${extraArg}{});`,

                        `${importStatement}
          const rest = {};
          const signal = ${creator}(5, ${extraArg}{
            name: "signal"
          });`,

                        plugin.namePlugin,
                        true,
                    )

                    testTransform(
                        'options excluding name',
                        `${importStatement}
          const rest = {};
          const signal = ${creator}(5, ${extraArg}{ equals: false, ...rest });`,

                        `${importStatement}
  const rest = {};
  const signal = ${creator}(5, ${extraArg}{
    name: "signal",
    equals: false,
    ...rest
  });`,

                        plugin.namePlugin,
                        true,
                    )

                    testTransform(
                        'options including name',
                        `${importStatement}
  const rest = {};
  const signal = ${creator}(5, ${extraArg}{ equals: false, name: "foo", ...rest });`,

                        `${importStatement}
  const rest = {};
  const signal = ${creator}(5, ${extraArg}{
    equals: false,
    name: "foo",
    ...rest
  });`,

                        plugin.namePlugin,
                        true,
                    )

                    testTransform(
                        'array of length 1',
                        `${importStatement}
  const [signal] = ${creator}(5);`,

                        `${importStatement}
  const [signal] = ${creator}(5, ${extraArg}{
    name: "signal"
  });`,

                        plugin.namePlugin,
                        true,
                    )

                    testTransform(
                        'array of length 2',
                        `${importStatement}
  const [signal, setSignal] = ${creator}(5);`,

                        `${importStatement}
  const [signal, setSignal] = ${creator}(5, ${extraArg}{
    name: "signal"
  });`,

                        plugin.namePlugin,
                        true,
                    )
                })
            }
        })
    }

    // Negative tests
    for (const [create, module] of [
        ['createSignal', 'solid-js/store'],
        ['createMemo', 'solid-js/store'],
        ['createStore', 'solid-js'],
        ['createMutable', 'solid-js'],
    ] as const) {
        test.describe(create, () => {
            test.test(`no import`, () => {
                const src = `const signal = ${create}();`

                assertTransform(src, src, plugin.namePlugin, true)
            })

            test.test(`incorrect import`, () => {
                const src = `import { ${create} } from "${module}";
  const signal = ${create}();`

                assertTransform(src, src, plugin.namePlugin, true)
            })
        })
    }
})


test.describe('effect primitives', () => {
    const fnName = 'fn'

    // Positive tests
    for (const create of ['createEffect', 'createRenderEffect', 'createComputed'] as const) {
        test.describe(create, () => {
            for (const [type, importStatement, creator] of [
                ['named import', `import { ${create} } from "solid-js";`, create],
                ['renamed import', `import { ${create} as foo } from "solid-js";`, 'foo'],
                ['namespace import', `import * as foo from "solid-js";`, `foo.${create}`],
            ] as const) {
                test.describe(type, () => {
                    testTransform(
                        'in a function declaration',
                        `${importStatement}
            function ${fnName}() {
              ${creator}(() => {});
            }`,
                        `${importStatement}
            function ${fnName}() {
              ${creator}(() => {}, undefined, {
                name: "in_${fnName}"
              });
            }`,
                        plugin.namePlugin,
                        true,
                    )
                })

                testTransform(
                    'in an arrow function',
                    `${importStatement}
          const ${fnName} = () => {
            ${creator}(() => {});
          };`,
                    `${importStatement}
          const ${fnName} = () => {
            ${creator}(() => {}, undefined, {
              name: "in_${fnName}"
            });
          };`,
                    plugin.namePlugin,
                    true,
                )

                testTransform(
                    'in a function expression',
                    `${importStatement}
          const ${fnName} = function () {
            ${creator}(() => {});
          };`,
                    `${importStatement}
          const ${fnName} = function () {
            ${creator}(() => {}, undefined, {
              name: "in_${fnName}"
            });
          };`,
                    plugin.namePlugin,
                    true,
                )

                testTransform(
                    'passed as a callback',
                    `${importStatement}
            ${fnName}(() => {
              ${creator}(() => {});
            });`,
                    `${importStatement}
            ${fnName}(() => {
              ${creator}(() => {}, undefined, {
                name: "to_${fnName}"
              });
            });`,
                    plugin.namePlugin,
                    true,
                )
            }
        })
    }

    // Negative tests
    for (const create of ['createEffect', 'createRenderEffect', 'createComputed'] as const) {
        test.describe(create, () => {
            test.test(`no import`, () => {
                const src = `function ${fnName}() {
          ${create}(() => {});
        }`

                assertTransform(src, src, plugin.namePlugin, true)
            })
        })
    }
})
