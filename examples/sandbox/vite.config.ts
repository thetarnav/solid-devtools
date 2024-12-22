import devtools from 'solid-devtools/vite'
import {defineConfig} from 'vite'
import solid from 'vite-plugin-solid'

const is_ext = process.argv.includes('--ext')

export default defineConfig(mode => {
    const is_build = mode.command === 'build'

    return {
        server: {port: 3000},
        plugins: [
            devtools({
                autoname: true,
                locator: {
                    targetIDE: 'vscode',
                    jsxLocation: true,
                    componentLocation: true,
                },
            }),
            solid({hot: true, dev: true}),
        ],
        define: {
            'import.meta.env.EXT': JSON.stringify(is_ext),
        },
        base: '', // for github pages to not start with absolute "/"
        mode: 'development',
        resolve: {
            conditions: ['browser', 'development']
        },
        build: {
            target: 'esnext',
            minify: false,
            sourcemap: true,
        },
        optimizeDeps: {
            exclude: ['solid-devtools', '@solid-devtools/*']
        },
    }
})
