import { crx } from '@crxjs/vite-plugin'
import path from 'path'
import solidPlugin from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

import { testConfig } from '../../configs/vitest.config'
import manifest from './manifest'
import pkg from './package.json'

const cwd = process.cwd()

export default defineConfig(config => {
  const isDev = config.mode === 'development'

  return {
    resolve: {
      alias: {
        'solid-js/web': path.resolve(cwd, 'node_modules/solid-js/web/dist/web.js'),
        'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/store.js'),
        'solid-js': path.resolve(cwd, 'node_modules/solid-js/dist/solid.js'),
      },
    },
    plugins: [solidPlugin({ dev: false, hot: false }), crx({ manifest })],
    define: {
      // need to insert the "" quotes manually, because vite just inserts the value as-is.
      __CLIENT_VERSION__: `"${pkg.dependencies['solid-devtools'].match(/\d+.\d+.\d+/)![0]}"`,
    },
    build: {
      emptyOutDir: !isDev,
      rollupOptions: {
        input: { panel: 'index.html' },
      },
      target: 'esnext',
    },
    test: testConfig,
  }
})
