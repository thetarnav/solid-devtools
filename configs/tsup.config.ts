import { Plugin } from 'esbuild'
import { solidPlugin } from 'esbuild-plugin-solid'
import { defineConfig, Options } from 'tsup'

export const CI =
    process.env['CI'] === 'true' ||
    process.env['CI'] === '"1"' ||
    process.env['GITHUB_ACTIONS'] === 'true' ||
    process.env['GITHUB_ACTIONS'] === '"1"' ||
    !!process.env['TURBO_HASH']

export default ({
    extension = 'ts',
    server = false,
    additionalEntries = [],
    additionalPlugins = [],
    overwrite,
    jsx,
    external = [],
}: {
    extension?: 'tsx' | 'ts'
    server?: boolean
    additionalEntries?: string[]
    additionalPlugins?: Plugin[]
    overwrite?: (overrideOptions: Options) => Options | Options[]
    jsx?: boolean
    external?: (string | RegExp)[]
} = {}) => {
    const entry = `src/index.${extension}`
    const baseEntries = server ? [entry, `src/server.${extension}`] : [entry]
    const mappedAdditionalEntries = additionalEntries.map(addEntry => {
        if (addEntry.includes('.')) return `src/${addEntry}`
        return `src/${addEntry}.${extension}`
    })
    return defineConfig(config => {
        const options: Options = {
            watch: config.watch,
            clean: config.watch ? false : true,
            treeshake: config.watch ? false : true,
            dts: {
                entry: [entry, ...mappedAdditionalEntries],
            },
            target: 'esnext',
            format: 'esm',
            entry: [...baseEntries, ...mappedAdditionalEntries],
            esbuildPlugins:
                extension === 'tsx' || jsx
                    ? [solidPlugin(), ...additionalPlugins]
                    : additionalPlugins,
            external: [
                'solid-js',
                /^solid-js\/[\w-]+$/,
                /^@solid-devtools\/shared\/[\w-]+$/,
                ...external,
            ],
        }
        return overwrite ? overwrite(options) : options
    })
}
