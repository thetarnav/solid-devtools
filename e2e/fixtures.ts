import { FrameLocator, Locator, Page, test as base, chromium } from '@playwright/test'
import assert from 'assert'
import path from 'path'

export const test = base.extend<{
    page: Page
    sdtFrame: FrameLocator | Locator
    search: Locator
}>({
    baseURL: async ({}, use, testInfo) => {
        await use(testInfo.project.use.baseURL)
    },
    page: async ({ context, baseURL }, use, testInfo) => {
        if (testInfo.project.name.includes('Overlay')) {
            const page = context.pages()[0]!
            await page.goto('/')
            await use(page)
            return
        }

        const page = context.pages().find(page => page.url().includes(baseURL!))
        assert(page)
        await use(page)
    },
    sdtFrame: async ({ context, page }, use, testInfo) => {
        let sdtFrame: FrameLocator | Locator

        if (testInfo.project.name.includes('Overlay')) {
            sdtFrame = page.getByTestId('solid-devtools-overlay')
        } else {
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

            sdtFrame = devtoolsPanel.frameLocator('[src^="chrome-extension://"][src$="index.html"]')
        }

        await sdtFrame.getByText('Root').first().waitFor() // Wait for all tree nodes to be visible
        await use(sdtFrame)
    },
    search: async ({ sdtFrame }, use) => {
        await use(sdtFrame.getByPlaceholder('Search'))
    },
})

test.use({
    context: async ({ baseURL }, use, testInfo) => {
        if (testInfo.project.name.includes('Overlay')) {
            const context = await chromium.launchPersistentContext('', { baseURL })
            await use(context)
            await context.close()
            return
        }

        const pathToExtension = path.resolve(__dirname, '../packages/extension/dist/')
        const context = await chromium.launchPersistentContext('', {
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
            headless: false,
            devtools: true, // will open devtools when new tab is opened
            baseURL,
        })

        const page = context.pages().find(page => page.url().includes('about:blank'))
        assert(page)
        const devtoolsPanel = context
            .pages()
            .find(page => page.url().includes('devtools://devtools/bundled/devtools_app.html'))
        assert(devtoolsPanel)

        // Since we can only initiate DevTools by opening a new tab, we need to go to
        // the sandbox in a new tab by clicking a link.
        await page.evaluate(baseURL => {
            const a = document.createElement('a')
            a.href = baseURL
            a.target = '_blank'
            a.innerText = 'open new tab'
            document.body.appendChild(a)
        }, baseURL!)

        const pagePromise = context.waitForEvent('page')
        await page.getByText('open new tab').click()
        const newPage = await pagePromise
        await newPage.waitForLoadState()

        await page.close()
        await devtoolsPanel.close()

        await use(context)

        await context.close()
    },
})
