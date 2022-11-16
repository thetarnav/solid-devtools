import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import devtoolsPlugin from '@solid-devtools/transform'
import Unocss from 'unocss/vite'

export default defineConfig(config => {
  const usingExtension = process.env.EXT === 'true' || process.env.EXT === '1'

  return {
    plugins: [
      devtoolsPlugin({
        // wrapStores: true,
        jsxLocation: true,
        componentLocation: true,
        name: true,
      }),
      solidPlugin({ hot: false, dev: true }),
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
    optimizeDeps: {
      exclude: ['solid-js/store', '@solid-devtools/debugger'],
    },
  }
})
