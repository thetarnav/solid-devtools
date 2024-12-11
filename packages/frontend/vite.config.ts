import solid from 'vite-plugin-solid'
import {defineConfig} from 'vitest/config'
import {resolveConfig, testConfig} from '../../configs/vitest.config.ts'

export default defineConfig({
    plugins: [solid()],
    test: testConfig,
    resolve: resolveConfig,
})
