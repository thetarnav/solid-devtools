import solid from 'vite-plugin-solid'
import {defineConfig} from 'vitest/config'
import {resolveConfig, testConfig} from '../../vitest.config.ts'

export default defineConfig({
    plugins: [solid() as any],
    test: testConfig,
    resolve: resolveConfig,
})
