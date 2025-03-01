import * as path from 'node:path'
import * as vite from 'vite'
import {type PluginItem, transformAsync} from '@babel/core'
import * as debug from '@solid-devtools/debugger/types'
import babelTsSyntaxPlugin from '@babel/plugin-syntax-typescript';
import * as babel from '../babel.ts'

export const enum DevtoolsModule {
    Main  = 'solid-devtools',
    Setup = 'solid-devtools/setup',
}

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

function get_extname(filename: string): string {
    filename = path.extname(filename)
    let idx = filename.indexOf('?')
    if (idx === -1)
        idx = filename.length
    return filename.slice(1, idx)
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

    const enabled_jsx_location = !!options.locator?.jsxLocation
    const enabled_component_location = !!options.locator?.componentLocation

    const jsx_location_plugin_config: babel.JsxLocationPluginConfig | null =
        (enabled_jsx_location || enabled_component_location)
            ? {
                jsx:        enabled_jsx_location,
                components: enabled_component_location,
            }
            : null

    let is_dev = false
    let project_root = process.cwd()

    return {
        name: 'solid-devtools',
        enforce: 'pre',
        configResolved(config) {
            project_root = config.root
            is_dev = config.command === 'serve' && config.mode !== 'production'
        },
        resolveId(id) {
            if (is_dev && id === DevtoolsModule.Main) return DevtoolsModule.Main
        },
        load(id) {
            // Inject runtime debugger script
            if (!is_dev || id !== DevtoolsModule.Main) return

            let code = `import "${DevtoolsModule.Setup}";`

            if (options.locator) {
                code += `\nimport { setLocatorOptions } from "${DevtoolsModule.Setup}";
        setLocatorOptions(${JSON.stringify(options.locator)});`
            }

            return code
        },
        async transform(source, id, transformOptions) {

            // production and server should be disabled
            if (transformOptions?.ssr || !is_dev) return

            const extname = get_extname(id)

            if (!['mjs', 'cjs', 'cts', 'mts', 'js', 'jsx', 'ts', 'tsx'].includes(extname)) return

            const is_jsx = extname === 'jsx' || extname === 'tsx'
            const plugins: PluginItem[] = []

            // plugins that should only run on .tsx/.jsx files in development
            if (jsx_location_plugin_config != null && is_jsx) {
                plugins.push(babel.jsxLocationPlugin(jsx_location_plugin_config))
            }
            if (options.autoname) {
                plugins.push(babel.namePlugin)
            }

            if (plugins.length === 0) {
                return {code: source}
            }

            // babel doesn't work with typescript by default
            plugins.unshift([babelTsSyntaxPlugin, {isTSX: is_jsx}])

            const result = await transformAsync(source, {
                babelrc:        false,
                configFile:     false,
                root:           project_root,
                filename:       id,
                sourceFileName: id,
                sourceMaps:     true,
                plugins:        plugins,
            })

            if (result) {
                return {code: result.code!, map: result.map!}
            }
        },
    }
}
