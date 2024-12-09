import devtools from 'solid-devtools/vite'
import {presetTypography} from 'unocss'
import Unocss from 'unocss/vite'
import {defineConfig} from 'vite'
import solid from 'vite-plugin-solid'

const is_ext = process.env['EXT'] === 'true' || process.env['EXT'] === '1'

export default defineConfig(mode => {
    const is_build = mode.command === 'build'

    return {
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
            Unocss({
                presets: [presetTypography()],
            }),
        ],
        define: {
            'process.env.EXT': JSON.stringify(is_ext),
            'process.env.BUILD': JSON.stringify(is_build),
        },
        mode: 'development',
        build: {
            target: 'esnext',
            minify: false,
        },
        optimizeDeps: {},
    }
})
