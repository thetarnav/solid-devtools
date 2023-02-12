import path from 'path'
import solid from 'vite-plugin-solid'
import { defineConfig, UserConfig } from 'vitest/config'

const cwd = process.cwd()

export const testConfig: UserConfig['test'] = {
  passWithNoTests: true,
  watch: false,
  globals: true,
  clearMocks: true,
  environment: 'jsdom',
  transformMode: {
    web: [/\.[jt]sx?$/],
  },
}

export const resolveConfig: UserConfig['resolve'] = {
  conditions: ['browser', 'development'],
  alias: {
    'solid-js/web': path.resolve(cwd, 'node_modules/solid-js/web/dist/dev.js'),
    'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/dev.js'),
    'solid-js': path.resolve(cwd, 'node_modules/solid-js/dist/dev.js'),
  },
}

export const vitestFullConfig = (patch?: (config: UserConfig) => void) =>
  defineConfig(() => {
    const config: UserConfig = {
      plugins: [solid()],
      test: testConfig,
      resolve: resolveConfig,
    }
    patch?.(config)
    return config
  })
