import * as vite from 'vite'
import {type PluginItem, transformAsync} from '@babel/core'
import * as debug from '@solid-devtools/debugger/types'
import * as babel from '../babel.ts'

export type LocatorPluginOptions = {
    /** Choose in which IDE the component source code should be revealed. */
    targetIDE?: Exclude<debug.LocatorOptions['targetIDE'], debug.TargetURLFunction>
    /**
     * Holding which key should enable the locator overlay?
     * @default 'Alt'
     */
    key?: debug.LocatorOptions['key']
    /** Inject location attributes to jsx templates */
    jsxLocation?: boolean
    /** Inject location information to component declarations */
    componentLocation?: boolean
}

export type DevtoolsPluginOptions = {
    /** Add automatic name when creating signals, memos, stores, or mutables */
    autoname?: boolean
    locator?: boolean | LocatorPluginOptions
    // /** For debugger development, do not enable! */
    // SDT_DEV?: boolean
}

function getFileExtension(filename: string): string {
    const index = filename.indexOf('?')
    const filenameWithoutQuery = index !== -1 ? filename.slice(0, index) : filename
    const lastDotIndex = filenameWithoutQuery.lastIndexOf('.')
    return lastDotIndex !== -1 ? filenameWithoutQuery.slice(lastDotIndex + 1) : ''
}

// This export is used for configuration.
export const devtoolsPlugin = (_options: DevtoolsPluginOptions = {}): vite.PluginOption => {
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
    const projectRoot = process.cwd()

    return {
        name: 'solid-devtools',
        enforce: 'pre',
        configResolved(config) {
            enablePlugin = config.command === 'serve' && config.mode !== 'production'
        },
        resolveId(id) {
            if (enablePlugin && id === babel.DevtoolsModule.Main) return babel.DevtoolsModule.Main
        },
        load(id) {
            // Inject runtime debugger script
            if (!enablePlugin || id !== babel.DevtoolsModule.Main) return

            let code = `import "${babel.DevtoolsModule.Setup}";`

            if (options.locator) {
                code += `\nimport { setLocatorOptions } from "${babel.DevtoolsModule.Setup}";
        setLocatorOptions(${JSON.stringify(options.locator)});`
            }

            return code
        },
        async transform(source, id, transformOptions) {
            // production and server should be disabled
            if (transformOptions?.ssr || !enablePlugin) return

            const extension = getFileExtension(id)

            if (!['mjs', 'cjs', 'cts', 'mts', 'js', 'jsx', 'ts', 'tsx'].includes(extension)) return

            const isJSX = extension === 'jsx' || extension === 'tsx'
            const plugins: PluginItem[] = []

            // plugins that should only run on .tsx/.jsx files in development
            if ((enabledJsxLocation || enabledComponentLocation) && isJSX) {
                plugins.push(
                    babel.jsxLocationPlugin({
                        jsx: enabledJsxLocation,
                        components: enabledComponentLocation,
                    }),
                )
            }
            if (options.autoname) {
                plugins.push(babel.namePlugin)
            }

            if (plugins.length === 0) return {code: source}

            // babel doesn't work with typescript by default
            plugins.splice(0, 0, ['@babel/plugin-syntax-typescript', {isTSX: isJSX}])

            const result = await transformAsync(source, {
                babelrc: false,
                configFile: false,
                root: projectRoot,
                filename: id,
                sourceFileName: id,
                sourceMaps: true,
                plugins,
            })

            if (result) {
                return {code: result.code!, map: result.map!}
            }
        },
    }
}
