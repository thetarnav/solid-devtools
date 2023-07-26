import { crx } from '@crxjs/vite-plugin'
import fs from 'fs'
import { createRequire } from 'node:module'
import path from 'path'
import solidPlugin from 'vite-plugin-solid'
import { defineConfig, UserConfig } from 'vitest/config'
import { testConfig } from '../../configs/vitest.config'
import manifest from './manifest'

const require = createRequire(import.meta.url)
const cwd = process.cwd()

const solidDevtoolsPkg = JSON.parse(
    fs.readFileSync(require.resolve('solid-devtools/package.json'), 'utf-8'),
) as { version: string }

const solidDevtoolsVersion = JSON.stringify(solidDevtoolsPkg.version.match(/\d+.\d+.\d+/)![0])

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
        plugins: [
            solidPlugin({ dev: false, hot: false }) as any,
            crx({ manifest }),
            {
                name: 'replace-version',
                enforce: 'pre',
                transform(code, id) {
                    if (id.includes('solid-devtools')) {
                        return code.replace(
                            /import\.meta\.env\.EXPECTED_CLIENT/g,
                            solidDevtoolsVersion,
                        )
                    }
                    return code
                },
            },
        ],
        build: {
            emptyOutDir: !isDev,
            rollupOptions: {
                input: { panel: 'index.html' },
            },
            target: 'esnext',
        },
        test: testConfig as any,
    } satisfies UserConfig
})
