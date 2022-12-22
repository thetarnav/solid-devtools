import { PluginItem, transformAsync } from '@babel/core'
import { PluginOption } from 'vite'
import { createRequire } from 'module'
import {
  LocatorOptions,
  MARK_COMPONENT,
  USE_LOCATOR,
  TargetURLFunction,
} from '@solid-devtools/debugger/types'
import jsxLocationPlugin, { MARK_COMPONENT_GLOBAL } from './location'
import namePlugin from './name'

const require = createRequire(import.meta.url)

const MAIN_CLIENT_MODULE = 'solid-devtools'
const DEBUGGER_MODULE = '@solid-devtools/debugger'
const INJECT_SCRIPT_ID = '__solid-devtools'

export type DevtoolsPluginOptions = {
  /** Add automatic name when creating signals, memos, stores, or mutables */
  autoname?: boolean
  locator?:
    | boolean
    | {
        /** Choose in which IDE the component source code should be revealed. */
        targetIDE?: Exclude<LocatorOptions['targetIDE'], TargetURLFunction>
        /**
         * Holding which key should enable the locator overlay?
         * @default 'Alt'
         */
        key?: LocatorOptions['key']
        /** Inject location attributes to jsx templates */
        jsxLocation?: boolean
        /** Inject location information to component declarations */
        componentLocation?: boolean
      }
}

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.')
  return index < 0 ? '' : filename.substring(index + 1)
}

// This export is used for configuration.
export const devtoolsPlugin = (_options: DevtoolsPluginOptions = {}): PluginOption => {
  const options = {
    autoname: _options.autoname ?? false,
    locator: _options.locator
      ? {
          targetIDE: false,
          jsxLocation: false,
          componentLocation: false,
          ...(_options.locator === true ? {} : _options.locator),
        }
      : undefined,
  }

  const enabledJsxLocation = !!options.locator?.jsxLocation
  const enabledComponentLocation = !!options.locator?.componentLocation

  let enablePlugin = false
  let projectRoot = process.cwd()

  let runtimeInstalled: false | typeof MAIN_CLIENT_MODULE | typeof DEBUGGER_MODULE = false

  return {
    name: 'solid-devtools',
    enforce: 'pre',
    config() {
      try {
        require(MAIN_CLIENT_MODULE)
        runtimeInstalled = MAIN_CLIENT_MODULE
      } catch (e) {
        try {
          require(DEBUGGER_MODULE)
          runtimeInstalled = DEBUGGER_MODULE
        } catch (e) {
          // runtimeInstalled = false
          // ! For some reason, this is not working. So will fallback to 'main' for now.
          runtimeInstalled = MAIN_CLIENT_MODULE
          // eslint-disable-next-line no-console
          console.log(
            `[solid-devtools]: Could not find "${MAIN_CLIENT_MODULE}" or "${DEBUGGER_MODULE}" module.`,
          )
        }
      }
    },
    configResolved(config) {
      enablePlugin = config.command === 'serve' && config.mode !== 'production'
    },
    transformIndexHtml() {
      if (enablePlugin && runtimeInstalled)
        return [
          {
            tag: 'script',
            attrs: { type: 'module', src: INJECT_SCRIPT_ID },
            injectTo: 'body-prepend',
          },
        ]
    },
    load(id) {
      // Inject runtime debugger script
      if (
        !enablePlugin ||
        !runtimeInstalled ||
        (id !== INJECT_SCRIPT_ID && id !== `/${INJECT_SCRIPT_ID}`)
      )
        return

      let code = `import "${runtimeInstalled}";`

      if (options.locator) {
        code += `\nimport { ${USE_LOCATOR}, ${MARK_COMPONENT} } from "${DEBUGGER_MODULE}";
${USE_LOCATOR}(${JSON.stringify(options.locator)});
window.${MARK_COMPONENT_GLOBAL} = ${MARK_COMPONENT};`
      }

      return code
    },
    async transform(source, id, transformOptions) {
      // production and server should be disabled
      if (transformOptions?.ssr || !enablePlugin) return

      const extension = getFileExtension(id)

      if (!['js', 'jsx', 'ts', 'tsx'].includes(extension)) return

      const isJSX = extension === 'jsx' || extension === 'tsx'
      const plugins: PluginItem[] = []

      // plugins that should only run on .tsx/.jsx files in development
      if ((enabledJsxLocation || enabledComponentLocation) && isJSX) {
        plugins.push(
          jsxLocationPlugin({
            jsx: enabledJsxLocation,
            components: enabledComponentLocation,
          }),
        )
      }
      if (options.autoname) {
        plugins.push(namePlugin)
      }

      if (plugins.length === 0) return

      // babel doesn't work with typescript by default
      plugins.splice(0, 0, ['@babel/plugin-syntax-typescript', { isTSX: isJSX }])

      const result = await transformAsync(source, {
        babelrc: false,
        configFile: false,
        root: projectRoot,
        filename: id,
        sourceFileName: id,
        plugins,
      })

      if (!result) return null
      const { code } = result
      if (!code) return null
      return { code }
    },
  }
}

export default devtoolsPlugin
