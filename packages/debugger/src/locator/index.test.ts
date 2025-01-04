let mockIsWindows = true

import {beforeEach, describe, expect, test, vi} from 'vitest'

vi.mock('@solid-primitives/platform', () => ({
    get isWindows() {
        return mockIsWindows
    },
}))

const fetchFunction = async () => (await import('./find-components.ts')).parseLocationString

describe('locator attribute pasting', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    test('windows', async () => {
        mockIsWindows = true
        const getLocationFromAttribute = await fetchFunction()

        expect(getLocationFromAttribute(`Users\\user\\Desktop\\test\\test.tsx:1:0`)).toEqual({
            file: 'Users\\user\\Desktop\\test\\test.tsx',
            line: 1,
            column: 0,
        })
    })

    test('unix', async () => {
        mockIsWindows = false
        const getLocationFromAttribute = await fetchFunction()

        expect(getLocationFromAttribute(`/home/username/project/src/App.tsx:10:5`)).toEqual({
            file: '/home/username/project/src/App.tsx',
            line: 10,
            column: 5,
        })
    })
})
