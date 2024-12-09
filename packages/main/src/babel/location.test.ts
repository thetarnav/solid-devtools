import {assertTransform, cwd, file} from './setup_test.ts'

import {LOCATION_ATTRIBUTE_NAME, WINDOW_PROJECTPATH_PROPERTY} from '@solid-devtools/debugger/types'
import {describe, test} from 'vitest'
import {DevtoolsModule} from './shared.ts'
import {
    jsxLocationPlugin,
    type JsxLocationPluginConfig,
    SET_COMPONENT_LOC,
    SET_COMPONENT_LOC_LOCAL,
} from './location.ts'

const setLocationImport = `import { ${SET_COMPONENT_LOC} as ${SET_COMPONENT_LOC_LOCAL} } from "${DevtoolsModule.Setup}";`

describe('location', () => {
    const testData: [
        name: string,
        src: string,
        expected: string,
        options: JsxLocationPluginConfig,
    ][] = [
        [
            'function component',
            `function Button(props) {
  return <button>Click me</button>
}`,
            `${setLocationImport}
function Button(props) {
  ${SET_COMPONENT_LOC_LOCAL}("${file}:1:0");
  return <button>Click me</button>;
}
globalThis.${WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
            {jsx: false, components: true},
        ],
        [
            'arrow component',
            `const Button = props => {
  return <button>Click me</button>
}`,
            `${setLocationImport}
const Button = props => {
  ${SET_COMPONENT_LOC_LOCAL}("${file}:1:6");
  return <button>Click me</button>;
};
globalThis.${WINDOW_PROJECTPATH_PROPERTY} = "${cwd}";`,
            {jsx: false, components: true},
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
            {jsx: true, components: false},
        ],
    ]

    testData.forEach(([name, src, expected, options]) => {
        test(name, () => {
            assertTransform(src, expected, jsxLocationPlugin(options))
        })
    })
})
