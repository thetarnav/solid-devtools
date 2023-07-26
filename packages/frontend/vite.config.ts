import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'
import { resolveConfig, testConfig } from '../../configs/vitest.config'

export default defineConfig({
    plugins: [solid()],
    test: testConfig,
    resolve: {
        ...resolveConfig,
        alias: {
            ...resolveConfig.alias,
            '@/': `${__dirname}/src/`,
        },
    },
})
