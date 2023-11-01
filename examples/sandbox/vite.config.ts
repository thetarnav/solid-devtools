import devtools from 'solid-devtools/vite'
import { presetTypography } from 'unocss'
import Unocss from 'unocss/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import solid from 'vite-plugin-solid'

const usingExtension = process.env['EXT'] === 'true' || process.env['EXT'] === '1'

export default defineConfig(mode => {
    const isBuild = mode.command === 'build'

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
            solid({ hot: true, dev: true }),
            Unocss({
                presets: [presetTypography()],
            }),
            Inspect(),
        ],
        define: {
            'process.env.EXT': JSON.stringify(usingExtension),
            'process.env.BUILD': JSON.stringify(isBuild),
        },
        mode: 'development',
        build: {
            target: 'esnext',
            minify: false,
        },
        optimizeDeps: {},
    }
})
