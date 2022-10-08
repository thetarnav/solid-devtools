import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import solid from 'vite-plugin-solid'
import { vanillaExtractPlugin as vanillaExtract } from '@vanilla-extract/vite-plugin'
import { dependencies, peerDependencies } from './package.json'

const externals = [...Object.keys(dependencies), ...Object.keys(peerDependencies)]

const r = (str: TemplateStringsArray) => resolve(__dirname, str.join(''))

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${__dirname}/src/`,
      '@solid-devtools/shared': r`../shared/src`,
    },
  },
  plugins: [
    // compiles solid jsx
    solid(),
    // compiles vanilla-extract stylesheets to dist/style.css
    vanillaExtract(),
    // generates type definitions
    dts({
      outputDir: './dist/types',
      copyDtsFiles: false,
    }),
  ],
  build: {
    lib: {
      entry: r`src/index.ts`,
      name: '@solid-devtools/frontend',
      fileName: 'index',
      formats: ['es'],
    },
    minify: false,
    target: 'esnext',
    rollupOptions: {
      external: importPath => {
        for (const dep of externals) {
          if (importPath.startsWith(dep)) return true
        }
        return false
      },
    },
  },
})
