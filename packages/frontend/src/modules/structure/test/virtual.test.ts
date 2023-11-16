import {describe, expect, test} from 'vitest'
import {getVirtualVars} from '../virtual'

describe('getVirtualVars', () => {
    test('no scroll', () => {
        const fullLength = 100
        const vh = 20
        const scroll = 0
        const {end, length, start} = getVirtualVars(fullLength, scroll, vh, 1)
        expect(start).toBe(0)
        expect(end).toBe(21)
        expect(length).toBe(21)
    })

    test('some scroll', () => {
        const fullLength = 100
        const vh = 20
        const scroll = 10
        const {end, length, start} = getVirtualVars(fullLength, scroll, vh, 1)
        expect(start).toBe(10)
        expect(end).toBe(31)
        expect(length).toBe(21)
    })

    test('low rows', () => {
        const fullLength = 10
        const vh = 20
        const scroll = 0
        const {end, length, start} = getVirtualVars(fullLength, scroll, vh, 1)
        expect(start).toBe(0)
        expect(end).toBe(10)
        expect(length).toBe(10)
    })

    test('scroll beyond the rows', () => {
        const fullLength = 100
        const vh = 20
        const scroll = 90
        const {end, length, start} = getVirtualVars(fullLength, scroll, vh, 1)
        expect(start).toBe(79)
        expect(end).toBe(100)
        expect(length).toBe(21)
    })

    test('scroll beyond the rows with low rows', () => {
        const fullLength = 15
        const vh = 20
        const scroll = 10
        const {end, length, start} = getVirtualVars(fullLength, scroll, vh, 1)
        expect(start).toBe(0)
        expect(end).toBe(15)
        expect(length).toBe(15)
    })
})
