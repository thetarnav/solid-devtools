import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import devtoolsPlugin from '@solid-devtools/transform'

export default defineConfig({
  plugins: [
    devtoolsPlugin({
      // wrapStores: true,
      jsxLocation: true,
      name: true,
    }),
    solidPlugin({ hot: false, dev: true }),
  ],
  resolve: {
    conditions: ['browser', 'development'],
  },
  mode: 'development',
  build: {
    target: 'esnext',
  },
})
