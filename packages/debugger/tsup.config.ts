import {solidPlugin} from 'esbuild-plugin-solid'
import {defineConfig, Options} from 'tsup'
import {dependencies, peerDependencies} from './package.json'

const external = Object.keys({...peerDependencies, ...dependencies})

export default defineConfig(config => {
    const watch = !!config.watch

    const common: Options = {
        platform: 'browser',
        format: 'esm',
        target: 'esnext',
        dts: true,
        treeshake: !watch,
        esbuildOptions(o) {
            o.chunkNames = 'chunks/[name]-[hash]'
        },
    }

    const options: Options[] = [
        {
            ...common,
            clean: !watch,
            entry: {
                index: 'src/index.ts',
                types: 'src/types.ts',
            },
            esbuildPlugins: [solidPlugin()],
        },
        {
            ...common,
            dts: false,
            entry: {bundled: 'src/index.ts'},
            esbuildPlugins: [solidPlugin()],
            noExternal: external,
        },
        {
            ...common,
            entry: {setup: 'src/setup.ts'},
        },
    ]
    return options
})
