import { FrameLocator, Locator, Page, test as base, chromium } from '@playwright/test'
import assert from 'assert'
import path from 'path'

export const test = base.extend<{
    devtoolsPanel: Page
    page: Page
    sdtFrame: FrameLocator
    search: Locator
}>({
    page: async ({ context }, use) => {
        const page = context.pages().find(page => page.url().includes('http://localhost:3000/'))
        assert(page)
        await use(page)
    },
    devtoolsPanel: async ({ context }, use) => {
        const devtoolsPanel = context
            .pages()
            .find(page => page.url().includes('devtools://devtools/bundled/devtools_app.html'))
        assert(devtoolsPanel)

        // Undock the devtools into a separate window so we can see the `solid` tab.
        await devtoolsPanel.getByLabel('Customize and control DevTools').click()
        await devtoolsPanel.getByLabel('Undock into separate window').click()
        await devtoolsPanel.getByText('Solid').click()

        // Somehow the window is not sized properly, causes half of the viewport
        // to be hidden. Interacting with elements outside the window area
        // wouldn't work.
        await devtoolsPanel.setViewportSize({ width: 640, height: 660 })

        await use(devtoolsPanel)
    },
    sdtFrame: async ({ devtoolsPanel }, use) => {
        const sdtPanel = devtoolsPanel.frameLocator(
            '[src^="chrome-extension://"][src$="index.html"]',
        )
        await sdtPanel.getByText('Root').first().waitFor() // Wait for all tree nodes to be visible
        await use(sdtPanel)
    },
    search: async ({ sdtFrame }, use) => {
        use(sdtFrame.getByPlaceholder('Search'))
    },
})

test.use({
    context: async ({}, use) => {
        const pathToExtension = path.resolve(__dirname, '../packages/extension/dist/')
        const context = await chromium.launchPersistentContext('', {
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
            headless: false,
            devtools: true, // will open devtools when new tab is opened
            baseURL: 'http://localhost:3000',
        })

        const page = context.pages().find(page => page.url().includes('about:blank'))
        assert(page)
        const devtoolsPanel = context
            .pages()
            .find(page => page.url().includes('devtools://devtools/bundled/devtools_app.html'))
        assert(devtoolsPanel)

        // Since we can only initiate DevTools by opening a new tab, we need to go to
        // the sandbox in a new tab by clicking a link.
        await page.evaluate(() => {
            const a = document.createElement('a')
            a.href = 'http://localhost:3000/'
            a.target = '_blank'
            a.click()
        })
        await page.waitForTimeout(1000) // Wait for the new tab to open
        await page.close()
        await devtoolsPanel.close()

        await use(context)

        await context.close()
    },
})
