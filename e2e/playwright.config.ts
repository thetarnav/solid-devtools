import {defineConfig} from '@playwright/test'

const is_ci = !!process.env['CI']

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: '.',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: is_ci,
    /* Retry on CI only */
    retries: is_ci ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: is_ci ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    webServer: [{
        command: 'pnpm run sandbox',
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !is_ci,
    }],
    use: {
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    projects: [{
        name: 'Chromium Overlay',
        use: { baseURL: 'http://localhost:3000' },
    }],
})
