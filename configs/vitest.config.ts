import path from 'path'
import solid from 'vite-plugin-solid'
import * as vi from 'vitest/config'

const cwd = process.cwd()

export const testConfig: vi.UserConfig['test'] = {
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
} satisfies vi.UserConfig['resolve']

export const vitestFullConfig = (patch?: (config: vi.UserConfig) => void) =>
    vi.defineConfig(() => {
        const config: vi.UserConfig = {
            plugins: [solid()],
            test: testConfig,
            resolve: resolveConfig,
        }
        patch?.(config)
        return config
    })
