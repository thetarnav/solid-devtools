import {describe, test} from 'vitest'
import {namePlugin} from './name'
import {assertTransform, testTransform} from './setup_test'

describe('returning primitives', () => {
    // Positive tests
    for (const [create, module, addExtraArg] of [
        ['createSignal', 'solid-js'],
        ['createMemo', 'solid-js', '1'],
        ['createStore', 'solid-js/store'],
        ['createMutable', 'solid-js/store'],
    ] as const) {
        const extraArg = addExtraArg ? 'undefined, ' : ''
        describe(create, () => {
            for (const [type, importStatement, creator] of [
                ['named import', `import { ${create} } from "${module}";`, create],
                ['renamed import', `import { ${create} as foo } from "${module}";`, 'foo'],
                ['namespace import', `import * as foo from "${module}";`, `foo.${create}`],
            ] as const) {
                describe(type, () => {
                    testTransform(
                        'no default value',
                        `${importStatement}
    const signal = ${creator}();`,
                        `${importStatement}
  const signal = ${creator}(undefined, ${extraArg}{
    name: "signal"
  });`,
                        namePlugin,
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
                        namePlugin,
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

                        namePlugin,
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

                        namePlugin,
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

                        namePlugin,
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

                        namePlugin,
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

                        namePlugin,
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
        describe(create, () => {
            test(`no import`, () => {
                const src = `const signal = ${create}();`

                assertTransform(src, src, namePlugin, true)
            })

            test(`incorrect import`, () => {
                const src = `import { ${create} } from "${module}";
  const signal = ${create}();`

                assertTransform(src, src, namePlugin, true)
            })
        })
    }
})

describe('effect primitives', () => {
    const fnName = 'fn'

    // Positive tests
    for (const create of ['createEffect', 'createRenderEffect', 'createComputed'] as const) {
        describe(create, () => {
            for (const [type, importStatement, creator] of [
                ['named import', `import { ${create} } from "solid-js";`, create],
                ['renamed import', `import { ${create} as foo } from "solid-js";`, 'foo'],
                ['namespace import', `import * as foo from "solid-js";`, `foo.${create}`],
            ] as const) {
                describe(type, () => {
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
                        namePlugin,
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
                    namePlugin,
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
                    namePlugin,
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
                    namePlugin,
                    true,
                )
            }
        })
    }

    // Negative tests
    for (const create of ['createEffect', 'createRenderEffect', 'createComputed'] as const) {
        describe(create, () => {
            test(`no import`, () => {
                const src = `function ${fnName}() {
          ${create}(() => {});
        }`

                assertTransform(src, src, namePlugin, true)
            })
        })
    }
})
