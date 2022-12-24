import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import devtools from '@solid-devtools/transform'
import Unocss from 'unocss/vite'

export default defineConfig(config => {
  const usingExtension = process.env.EXT === 'true' || process.env.EXT === '1'

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
      Unocss(),
    ],
    define: {
      'process.env.EXT': JSON.stringify(usingExtension),
    },
    resolve: {
      conditions: ['browser', 'development'],
    },
    mode: 'development',
    build: {
      target: 'esnext',
      minify: false,
    },
    optimizeDeps: {},
  }
})
