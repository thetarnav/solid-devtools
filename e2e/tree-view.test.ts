import { expect } from '@playwright/test'
import { test } from './fixtures.ts'

test('Search node in tree view', async ({ sdt_frame, search }) => {
    const selectedNode = sdt_frame.getByRole('treeitem', { selected: true })
    await search.fill('Theme')

    // Press enter to select the matching node
    await search.press('Enter')
    await expect(selectedNode).toHaveText(/ThemeProvider/)

    // Press enter to go to the next matching node
    await search.press('Enter')
    await expect(selectedNode).toHaveText(/ThemeExample/)
})

test('Picking node using locator', async ({ sdt_frame, page }) => {
    const selectedNode = sdt_frame.getByRole('treeitem', { selected: true })
    const zeroIsEven = page.getByText('0 is even!')

    await sdt_frame.getByTitle('Select an element in the page to inspect it').click()

    await zeroIsEven.hover()
    await zeroIsEven.click()

    await expect(selectedNode).toHaveText(/Bold/)
})

test('Reflected signal in Inspector', async ({ sdt_frame, page }) => {
    await sdt_frame.getByText('App').click()

    const count = sdt_frame.getByLabel('count', { exact: true })
    const count_button = page.getByText('Count: 0').first()

    await expect(count).toHaveText(/0/)
    await count_button.click()
    await expect(count).toHaveText(/1/)
})

test('Reflected memos in Inspector', async ({ sdt_frame, page, search }) => {
    const todo_input = page.getByPlaceholder('enter todo and click +')
    const todo_button = page.getByText('+')
    const new_title = sdt_frame.getByLabel('newTitle', { exact: true })
    const signal = sdt_frame.getByLabel('valuesInASignal signal')
    const values = signal.getByLabel('values', { exact: true })
    const title = signal.getByLabel('title', { exact: true })
    const done = signal.getByLabel('done', { exact: true })

    await search.fill('Todos')
    await search.press('Enter')

    await signal.getByLabel(/Expand or collapse/).click()
    await expect(values).toHaveText(/Empty Array/)
    await expect(new_title).toBeEmpty()

    await todo_input.fill('Buy groceries')
    await expect(new_title).toHaveText(/Buy groceries/)
    await todo_button.click()
    await expect(new_title).toBeEmpty()

    await expect(values).toHaveText('Array [1]')

    await signal.getByLabel('Expand or collapse values', { exact: true }).click()
    await signal.getByLabel('Expand or collapse 0').click()

    await expect(title).toHaveText(/Buy groceries/)
    await expect(done).toBeChecked({ checked: false })
    await page
        .getByRole('checkbox')
        .and(page.getByLabel(/Buy groceries/))
        .check()
    await expect(done).toBeChecked()
})

test('Inspect context nodes', async ({ sdt_frame, search }) => {
    /*
        First ctx node is visible immediately
    */
    let node = await sdt_frame.getByText('Context').nth(0)
    await node.click()
    let signal = sdt_frame.getByLabel('value signal', { exact: true })
    let value = signal.getByLabel('value', { exact: true })
    await expect(value).toHaveText('Array [2]')

    /*
        Second ctx node can be below the fold
        It's the one above the "PassChildren" node
    */
    await search.fill('PassChildren')
    await search.press('Enter')

    const tree_items = await sdt_frame.getByRole('treeitem')
    const idx = await tree_items.evaluateAll(
        els => els.findIndex(el => el.textContent?.includes('PassChildren')) - 1,
    )
    node = await tree_items.nth(idx)

    await node.click()
    signal = sdt_frame.getByLabel('value signal', { exact: true })
    await signal.waitFor()
    value = signal.getByLabel('value', { exact: true })
    await expect(value).toHaveText('Object [5]')
})
