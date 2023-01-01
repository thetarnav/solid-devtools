import { describe, test } from 'vitest'
import plugin from '../name'
import { assertTransform } from './setup'

// Positive tests
for (const [create, module, addExtraArg] of [
  ['createSignal', 'solid-js'],
  ['createMemo', 'solid-js', '1'],
  ['createStore', 'solid-js/store'],
  ['createMutable', 'solid-js/store'],
]) {
  const extraArg = addExtraArg ? 'undefined, ' : ''
  describe(create, () => {
    for (const [type, importStatement, creator] of [
      ['named import', `import { ${create} } from "${module}";`, create],
      ['renamed import', `import { ${create} as foo } from "${module}";`, 'foo'],
      ['namespace import', `import * as foo from "${module}";`, `foo.${create}`],
    ]) {
      describe(type, () => {
        test('no default value', () => {
          const src = `${importStatement}
  const signal = ${creator}();`

          const expectedOutput = `${importStatement}
const signal = ${creator}(undefined, ${extraArg}{
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test('default value', () => {
          const src = `${importStatement}
const signal = ${creator}(5);`

          const expectedOutput = `${importStatement}
const signal = ${creator}(5, ${extraArg}{
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test('empty options', () => {
          const src = `${importStatement}
const rest = {};
const signal = ${creator}(5, ${extraArg}{});`

          const expectedOutput = `${importStatement}
const rest = {};
const signal = ${creator}(5, ${extraArg}{
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test('options excluding name', () => {
          const src = `${importStatement}
const rest = {};
const signal = ${creator}(5, ${extraArg}{ equals: false, ...rest });`

          const expectedOutput = `${importStatement}
const rest = {};
const signal = ${creator}(5, ${extraArg}{
  name: "signal",
  equals: false,
  ...rest
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test('options including name', () => {
          const src = `${importStatement}
const rest = {};
const signal = ${creator}(5, ${extraArg}{ equals: false, name: "foo", ...rest });`

          const expectedOutput = `${importStatement}
const rest = {};
const signal = ${creator}(5, ${extraArg}{
  equals: false,
  name: "foo",
  ...rest
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test('array of length 1', () => {
          const src = `${importStatement}
const [signal] = ${creator}(5);`

          const expectedOutput = `${importStatement}
const [signal] = ${creator}(5, ${extraArg}{
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test('array of length 2', () => {
          const src = `${importStatement}
const [signal, setSignal] = ${creator}(5);`

          const expectedOutput = `${importStatement}
const [signal, setSignal] = ${creator}(5, ${extraArg}{
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })
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
]) {
  describe(create, () => {
    test(`no import`, () => {
      const src = `const signal = ${create}();`

      assertTransform(src, src, plugin)
    })

    test(`incorrect import`, () => {
      const src = `import { ${create} } from "${module}";
const signal = ${create}();`

      assertTransform(src, src, plugin)
    })
  })
}
