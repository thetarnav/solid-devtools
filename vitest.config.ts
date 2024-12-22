import * as path  from 'node:path'
import      solid from 'vite-plugin-solid'
import * as vi    from 'vitest/config'

const cwd = process.cwd()

export default vi.defineConfig({
    plugins: [solid() as any],
    test:    {
        passWithNoTests: true,
        watch:           false,
        environment:     'jsdom',
        // isolate:         false,
        include:         ['packages/**/*.test.{ts,tsx,js,jsx}'],
    },
    resolve: {
        conditions: ['browser', 'development'],
        alias:      {
            'solid-js/web':   path.resolve(cwd, 'node_modules/solid-js/web/dist/dev.js'),
            'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/dev.js'),
            'solid-js':       path.resolve(cwd, 'node_modules/solid-js/dist/dev.js'),
        },
    },
})
