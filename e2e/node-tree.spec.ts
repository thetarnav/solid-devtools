import { expect } from '@playwright/test'
import { test } from './fixtures'

test('Search node in tree view', async ({ sdtFrame, search }) => {
    const selectedNode = sdtFrame.getByRole('treeitem', { selected: true })
    await search.fill('Theme')

    // Press enter to select the matching node
    await search.press('Enter')
    await expect(selectedNode).toHaveText(/ThemeProvider/)

    // Press enter to go to the next matching node
    await search.press('Enter')
    await expect(selectedNode).toHaveText(/ThemeExample/)
})

test('Picking node using locator', async ({ sdtFrame, page }) => {
    const selectedNode = sdtFrame.getByRole('treeitem', { selected: true })
    const zeroIsEven = page.getByText('0 is even!')

    await sdtFrame.getByTitle('Select an element in the page to inspect it').click()

    await zeroIsEven.hover()
    await zeroIsEven.click()

    await expect(selectedNode).toHaveText(/Bold/)
})

test('Reflected signal in Inspector', async ({ sdtFrame, page }) => {
    await sdtFrame.getByText('App').click()

    const countSignal = sdtFrame.getByLabel('count signal')
    const countButton = page.getByText('Count: 0').first()

    await expect(countSignal).toHaveText(/count0/)
    await countButton.click()
    await expect(countSignal).toHaveText(/count1/)
})

test('Reflected memos in Inspector', async ({ sdtFrame, page, search }) => {
    const todoInput = page.getByPlaceholder('enter todo and click +')
    const todoButton = page.getByText('+')
    const newTitle = sdtFrame.getByLabel('newTitle', { exact: true })
    const signal = sdtFrame.getByLabel('valuesInASignal signal')
    const values = signal.getByLabel('values', { exact: true })
    const title = signal.getByLabel('title', { exact: true })
    const done = signal.getByLabel('done', { exact: true })

    await search.fill('Todos')
    await search.press('Enter')

    await signal.getByLabel(/Expand or collapse/).click()
    await expect(values).toHaveText(/Empty Array/)
    await expect(newTitle).toBeEmpty()

    await todoInput.fill('Buy groceries')
    await expect(newTitle).toHaveText(/Buy groceries/)
    await todoButton.click()
    await expect(newTitle).toBeEmpty()

    await expect(values).toHaveText('Array [1]')

    await signal.getByLabel('Expand or collapse values', { exact: true }).click()
    await signal.getByLabel('Expand or collapse 0').click()

    await expect(title).toHaveText(/Buy groceries/)
    await expect(done).toBeChecked({ checked: false })
    await page.getByRole('checkbox').check()
    await expect(done).toBeChecked()
})
