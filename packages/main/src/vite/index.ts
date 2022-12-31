import path from 'path'
import { PluginItem, transformAsync } from '@babel/core'
import {
  LocatorOptions,
  MARK_COMPONENT,
  TargetURLFunction,
  USE_LOCATOR,
} from '@solid-devtools/debugger/types'
// organize-imports-ignore vite import needs to happen before solid-start
import { PluginOption } from 'vite'
import type { Options as SolidStartOptions } from 'solid-start/vite/plugin'
import jsxLocationPlugin, { MARK_COMPONENT_GLOBAL } from './location'
import namePlugin from './name'

const CLIENT_MODULE = 'solid-devtools'
const INJECT_SCRIPT_ID = '/__solid-devtools'

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
  // /** For debugger development, do not enable! */
  // SDT_DEV?: boolean
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
    // SDT_DEV: _options.SDT_DEV ?? false,
  } satisfies DevtoolsPluginOptions

  const enabledJsxLocation = !!options.locator?.jsxLocation
  const enabledComponentLocation = !!options.locator?.componentLocation

  let enablePlugin = false
  let projectRoot = process.cwd()
  let solidStartRootEntry: string | undefined

  return {
    name: 'solid-devtools',
    enforce: 'pre',
    configResolved(config) {
      enablePlugin = config.command === 'serve' && config.mode !== 'production'

      if ('solidOptions' in config && typeof config.solidOptions === 'object') {
        const solidOptions = config.solidOptions as SolidStartOptions
        solidStartRootEntry = path.normalize(solidOptions.rootEntry)
      }
    },
    transformIndexHtml() {
      if (enablePlugin)
        return [
          {
            tag: 'script',
            attrs: { type: 'module', src: INJECT_SCRIPT_ID },
            injectTo: 'body-prepend',
          },
        ]
    },
    resolveId(id) {
      if (id === INJECT_SCRIPT_ID) return INJECT_SCRIPT_ID
    },
    load(id) {
      // Inject runtime debugger script
      if (!enablePlugin || id !== INJECT_SCRIPT_ID) return

      const importPath = JSON.stringify(CLIENT_MODULE)

      let code = `import ${importPath};`

      if (options.locator) {
        code += `\nimport { ${USE_LOCATOR}, ${MARK_COMPONENT} } from ${importPath};
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

      // For solid-start, inject the debugger script before the root entry point
      if (solidStartRootEntry && path.normalize(id) === solidStartRootEntry) {
        source = `import ${JSON.stringify(INJECT_SCRIPT_ID)}\n${source}`
      }

      if (plugins.length === 0) return { code: source }

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

      return { code: result?.code ?? source }
    },
  }
}
