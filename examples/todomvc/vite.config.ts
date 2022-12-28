import path from 'path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

const pathToPackages = path.resolve(__dirname, '..', '..', 'packages')

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      // used inside packages/debugger
      '@shared': path.resolve(pathToPackages, 'shared'),
      '@ui': path.resolve(pathToPackages, 'ui', 'src'),
      '@solid-devtools/ext-adapter': path.resolve(pathToPackages, 'ext-adapter', 'src'),
    },
  },
  build: {
    target: 'esnext',
  },
})
