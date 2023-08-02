import { defineConfig } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env['CI'],
    /* Retry on CI only */
    retries: process.env['CI'] ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env['CI'] ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    webServer: [
        {
            command: 'pnpm run sandbox:ext',
            url: 'http://localhost:3000',
            timeout: 120_000,
        },
        {
            command: 'pnpm run sandbox',
            url: 'http://localhost:3001',
            timeout: 120_000,
        },
    ],
    use: {
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'Chromium Extension',
            use: { baseURL: 'http://localhost:3000' },
        },
        {
            name: 'Chromium Overlay',
            use: { baseURL: 'http://localhost:3001' },
        },
    ],
})
