import * as v from 'vitest'
import {parseLocationString} from './locator.ts'

v.describe('locator attribute pasting', () => {

    v.test('windows', () => {
        v.expect(parseLocationString(`Users\\user\\Desktop\\test\\test.tsx:1:0`)).toEqual({
            file: 'Users\\user\\Desktop\\test\\test.tsx',
            line: 1,
            column: 0,
        })
    })

    v.test('unix', () => {
        v.expect(parseLocationString(`/home/username/project/src/App.tsx:10:5`)).toEqual({
            file: '/home/username/project/src/App.tsx',
            line: 10,
            column: 5,
        })
    })
})
