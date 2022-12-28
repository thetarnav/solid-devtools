import devtools from 'solid-devtools/vite'
import Unocss from 'unocss/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import solid from 'vite-plugin-solid'

const usingExtension = process.env.EXT === 'true' || process.env.EXT === '1'

export default defineConfig({
  plugins: [
    devtools({
      SDT_DEV: true,
      autoname: true,
      locator: {
        targetIDE: 'vscode',
        jsxLocation: true,
        componentLocation: true,
      },
    }),
    solid({ hot: true, dev: true }),
    Unocss(),
    Inspect(),
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
})
