import * as pw from '@playwright/test'
import assert from 'assert'
import path from 'path'

export const test = pw.test.extend<{
    page: pw.Page
    sdt_frame: pw.FrameLocator | pw.Locator
    search: pw.Locator
}>({
    baseURL: async ({}, use, testInfo) => {
        await use(testInfo.project.use.baseURL)
    },
    context: async ({ baseURL }, use, testInfo) => {
        if (testInfo.project.name.includes('Overlay')) {
            const context = await pw.chromium.launchPersistentContext('', { baseURL: baseURL })
            await use(context)
            await context.close()
            return
        }

        const path_to_extension = path.resolve(__dirname, '../packages/extension/dist/chrome')
        const context = await pw.chromium.launchPersistentContext('', {
            args: [
                '--headless=new',
                `--disable-extensions-except=${path_to_extension}`,
                `--load-extension=${path_to_extension}`,
            ],
            devtools: true, // will open devtools when new tab is opened
            baseURL: baseURL,
        })

        const page = context.pages().find(page => page.url().includes('about:blank'))
        assert(page)
        const devtools_panel = context
            .pages()
            .find(page => page.url().includes('devtools://devtools/bundled/devtools_app.html'))
        assert(devtools_panel)

        // Since we can only initiate DevTools by opening a new tab, we need to go to
        // the sandbox in a new tab by clicking a link.
        await page.evaluate(baseURL => {
            const a = document.createElement('a')
            a.href = baseURL
            a.target = '_blank'
            a.innerText = 'open new tab'
            document.body.appendChild(a)
        }, baseURL!)

        const page_promise = context.waitForEvent('page')
        await page.getByText('open new tab').click()
        const new_page = await page_promise
        // wait for the new page to be interactive
        await new_page.getByRole('button').first().click({ trial: true })

        await devtools_panel.close()
        await page.close()

        await use(context)

        await context.close()
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
    sdt_frame: async ({ context, page }, use, testInfo) => {
        let sdt_frame: pw.FrameLocator | pw.Locator

        if (testInfo.project.name.includes('Overlay')) {
            sdt_frame = page.getByTestId('solid-devtools-overlay')
        } else {
            const devtools_panel = context
                .pages()
                .find(page => page.url().includes('devtools://devtools/bundled/devtools_app.html'))
            assert(devtools_panel)

            // Undock the devtools into a separate window so we can see the `solid` tab.
            await devtools_panel.getByLabel('Customize and control DevTools').click()
            await devtools_panel.getByLabel('Undock into separate window').click()
            await devtools_panel.getByText('Solid').click()

            // Somehow the window is not sized properly, causes half of the viewport
            // to be hidden. Interacting with elements outside the window area
            // wouldn't work.
            await devtools_panel.setViewportSize({ width: 640, height: 660 })

            sdt_frame = devtools_panel.frameLocator(
                '[src^="chrome-extension://"][src$="index.html"]',
            )
        }

        await sdt_frame.getByText('Root').first().waitFor() // Wait for all tree nodes to be visible
        await use(sdt_frame)
    },
    search: async ({ sdt_frame }, use) => {
        await use(sdt_frame.getByPlaceholder('Search'))
    },
})
