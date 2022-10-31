import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'path'

import { testConfig } from '../../configs/vitest.config'
import manifest from './manifest'
import pkg from './package.json'

const isDev = process.env.NODE_ENV === 'development'

const r = (str: TemplateStringsArray) => resolve(__dirname, str.join(''))

export default defineConfig({
  plugins: [solidPlugin({ dev: false }), crx({ manifest })],
  resolve: {
    conditions: ['browser', 'development'],
    alias: {
      '@solid-devtools/shared': r`../shared/src`,
    },
  },
  define: {
    // need to insert the "" quotes manually, because vite just inserts the value as-is.
    __CLIENT_VERSION__: `"${pkg.dependencies['solid-devtools'].match(/\d+.\d+.\d+/)![0]}"`,
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
  test: testConfig,
})
