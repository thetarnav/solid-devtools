import { PluginItem, transformAsync } from '@babel/core'
import { PluginOption } from 'vite'
import jsxLocationPlugin from './location'
import namePlugin from './name'

export interface DevtoolsPluginOptions {
  /** Add automatic name when creating signals, memos, stores, or mutables */
  name?: boolean
  /** Inject location attributes to jsx templates */
  jsxLocation?: boolean
  /** Inject location information to component declarations */
  componentLocation?: boolean
}

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.')
  return index < 0 ? '' : filename.substring(index + 1)
}

// This export is used for configuration.
export const devtoolsPlugin = (options: DevtoolsPluginOptions = {}): PluginOption => {
  const { name = false, jsxLocation = false, componentLocation = false } = options

  let enablePlugin = false
  let projectRoot = process.cwd()

  return {
    name: 'solid-devtools',
    enforce: 'pre',
    configResolved(config) {
      enablePlugin = config.command === 'serve' && config.mode !== 'production'
    },
    async transform(source, id, transformOptions) {
      // production and server should be disabled
      if (transformOptions?.ssr || !enablePlugin) return

      const extension = getFileExtension(id)

      if (!['js', 'jsx', 'ts', 'tsx'].includes(extension)) return

      const isJSX = extension === 'jsx' || extension === 'tsx'
      const plugins: PluginItem[] = []

      // plugins that should only run on .tsx/.jsx files in development
      if ((jsxLocation || componentLocation) && isJSX) {
        plugins.push(jsxLocationPlugin({ jsx: jsxLocation, components: componentLocation }))
      }
      if (name) {
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
