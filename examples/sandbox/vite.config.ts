import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import devtoolsPlugin from '@solid-devtools/transform'
import Unocss from 'unocss/vite'

export default defineConfig({
  plugins: [
    devtoolsPlugin({
      // wrapStores: true,
      // jsxLocation: true,
      name: true,
    }),
    solidPlugin({ hot: false, dev: true }),
    Unocss(),
  ],
  resolve: {
    conditions: ['browser', 'development'],
  },
  mode: 'development',
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['solid-js/store', '@solid-devtools/debugger'],
  },
})
