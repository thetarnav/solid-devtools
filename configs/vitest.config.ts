import path from 'path'
import solid from 'vite-plugin-solid'
import { InlineConfig } from 'vitest'
import { defineConfig, UserConfig } from 'vitest/config'

const cwd = process.cwd()

export const testConfig: InlineConfig = {
    passWithNoTests: true,
    watch: false,
    globals: true,
    clearMocks: true,
    environment: 'jsdom',
    transformMode: {
        web: [/\.[jt]sx?$/],
    },
}

export const resolveConfig = {
    conditions: ['browser', 'development'],
    alias: {
        'solid-js/web': path.resolve(cwd, 'node_modules/solid-js/web/dist/dev.js'),
        'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/dev.js'),
        'solid-js': path.resolve(cwd, 'node_modules/solid-js/dist/dev.js'),
    },
} satisfies UserConfig['resolve']

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
