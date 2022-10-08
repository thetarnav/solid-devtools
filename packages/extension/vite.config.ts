import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { resolve } from 'path'

import vitestConfig from '../../configs/vitest.config'
import manifest from './manifest'
import pkg from './package.json'

const isDev = process.env.NODE_ENV === 'development'

const r = (str: TemplateStringsArray) => resolve(__dirname, str.join(''))

export default defineConfig({
  plugins: [solidPlugin({ dev: false }), vanillaExtractPlugin(), crx({ manifest })],
  resolve: {
    alias: {
      '@solid-devtools/shared': r`../shared/src`,
    },
  },
  define: {
    // need to insert the "" quotes manually, because vite just inserts the value as-is.
    __CLIENT_VERSION__: `"${pkg.devDependencies['solid-devtools'].match(/\d+.\d+.\d+/)![0]}"`,
  },
  build: {
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    rollupOptions: {
      input: {
        panel: 'index.html',
      },
    },
    target: 'esnext',
  },
  ...vitestConfig,
})
