import * as path  from 'node:path'
import      solid from 'vite-plugin-solid'
import * as vi    from 'vitest/config'

const cwd = process.cwd()

export const testConfig: vi.ViteUserConfig['test'] = {
    passWithNoTests: true,
    watch:           false,
    globals:         true,
    clearMocks:      true,
    environment:     'jsdom',
}

export const resolveConfig = {
    conditions: ['browser', 'development'],
    alias: {
        'solid-js/web':   path.resolve(cwd, 'node_modules/solid-js/web/dist/dev.js'),
        'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/dev.js'),
        'solid-js':       path.resolve(cwd, 'node_modules/solid-js/dist/dev.js'),
    },
} satisfies vi.ViteUserConfig['resolve']

export const vitestFullConfig = (patch?: (config: vi.ViteUserConfig) => void) =>
    vi.defineConfig(() => {
        const config: vi.ViteUserConfig = {
            plugins: [solid() as any],
            test: testConfig,
            resolve: resolveConfig,
        }
        patch?.(config)
        return config
    })
