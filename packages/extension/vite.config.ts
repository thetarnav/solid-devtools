import { crx } from '@crxjs/vite-plugin'
import solidPlugin from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

import { testConfig } from '../../configs/vitest.config'
import manifest from './manifest'
import pkg from './package.json'

export default defineConfig(config => {
  const isDev = config.mode === 'development'

  return {
    plugins: [solidPlugin({ dev: false }), crx({ manifest })],
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
