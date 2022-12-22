import { assertTransform, cwd, file } from './setup'
import { describe, test } from 'vitest'
import getPlugin, { MARK_COMPONENT_GLOBAL } from '../src/location'
import {
  LOCATION_ATTRIBUTE_NAME,
  WINDOW_PROJECTPATH_PROPERTY,
} from '@solid-devtools/debugger/types'

describe('location', () => {
  const testData: [
    name: string,
    src: string,
    expected: string,
    options: Parameters<typeof getPlugin>[0],
  ][] = [
    [
      'function component',
      `function Button(props) {
  return <button>Click me</button>
}`,
      `function Button(props) {
  globalThis.${MARK_COMPONENT_GLOBAL}("${file}:1:0");
  return <button>Click me</button>;
}
globalThis.${WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
      { jsx: false, components: true },
    ],
    [
      'arrow component',
      `const Button = props => {
  return <button>Click me</button>
}`,
      `const Button = props => {
  globalThis.${MARK_COMPONENT_GLOBAL}("${file}:1:6");
  return <button>Click me</button>;
};
globalThis.${WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
      { jsx: false, components: true },
    ],
    [
      'jsx',
      `function Button(props) {
  return <button>Click me</button>
}`,
      `function Button(props) {
  return <button ${LOCATION_ATTRIBUTE_NAME}="${file}:2:11">Click me</button>;
}
globalThis.${WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
      { jsx: true, components: false },
    ],
  ]

  testData.forEach(([name, src, expected, options]) => {
    test(name, () => {
      assertTransform(src, expected, getPlugin(options))
    })
  })
})
