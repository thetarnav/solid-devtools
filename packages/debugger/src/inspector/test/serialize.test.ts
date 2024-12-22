import '../../setup.ts'

import {type Truthy} from '@solid-primitives/utils'
import {createMutable, createStore} from 'solid-js/store'
import {describe, expect, test, vi} from 'vitest'
import {ObjectType, getObjectById} from '../../main/id.ts'
import {encodeValue} from '../serialize.ts'
import {type EncodedValue, INFINITY, NAN, NEGATIVE_INFINITY, UNDEFINED, ValueType} from '../types.ts'

let mockLAST_ID = 0
vi.mock('../../main/get-id', () => ({getNewSdtId: () => '#' + mockLAST_ID++}))

type Expectations = [name: string, data: unknown, encoded: EncodedValue[]][]

const div1 = document.createElement('div')
const a1 = document.createElement('a')
const div2 = document.createElement('div')

const _testFunction = () => {
    /**/
}

const [state] = createStore({a: 1, b: 2, c: 3})
const mutable = createMutable({a: 1, b: 2, c: 3})

describe('encodeValue Preview', () => {
    mockLAST_ID = 0

    const encodePreviewExpectations: Expectations = [
        ['Infinity', Infinity, [[ValueType.Number, INFINITY]]],
        ['Negative Infinity', -Infinity, [[ValueType.Number, NEGATIVE_INFINITY]]],
        ['NaN', NaN, [[ValueType.Number, NAN]]],
        ['Number', 1, [[ValueType.Number, 1]]],
        ['Boolean true', true, [[ValueType.Boolean, true]]],
        ['Boolean false', false, [[ValueType.Boolean, false]]],
        ['String', '', [[ValueType.String, '']]],
        ['String', 'foo', [[ValueType.String, 'foo']]],
        ['Null', null, [[ValueType.Null, null]]],
        ['Undefined', undefined, [[ValueType.Null, UNDEFINED]]],
        ['Named Symbol', Symbol('foo'), [[ValueType.Symbol, 'foo']]],
        ['Symbol', Symbol(), [[ValueType.Symbol, '']]],
        [
            'Function',
            () => {
                /**/
            },
            [[ValueType.Function, '']],
        ],
        ['Named Function', _testFunction, [[ValueType.Function, '_testFunction']]],
        ['Element div', div1, [[ValueType.Element, '#0:div']]],
        ['Element a', a1, [[ValueType.Element, '#1:a']]],
        ['Array empty', [], [[ValueType.Array, 0]]],
        ['Array', [1, 2, 3], [[ValueType.Array, 3]]],
        ['Object empty', {}, [[ValueType.Object, 0]]],
        ['Object', {a: 1, b: 2, c: 3}, [[ValueType.Object, 3]]],
        ['Date', new Date(), [[ValueType.Instance, 'Date']]],
        ['Error', new Error(), [[ValueType.Instance, 'Error']]],
        ['Map', new Map(), [[ValueType.Instance, 'Map']]],
        ['WeakMap', new WeakMap(), [[ValueType.Instance, 'WeakMap']]],
        ['Set', new Set(), [[ValueType.Instance, 'Set']]],
        [
            'Store',
            state,
            [
                [ValueType.Store, '#2:1'],
                [ValueType.Object, 3],
            ],
        ],
        [
            'Mutable',
            mutable,
            [
                [ValueType.Store, '#3:1'],
                [ValueType.Object, 3],
            ],
        ],
    ]

    for (const [testName, value, expectation] of encodePreviewExpectations) {
        test(testName, () => {
            const s = encodeValue(value, false)
            expect(s).toEqual(expectation)
            expect(JSON.parse(JSON.stringify(s))).toEqual(s)
        })
    }
})

describe('encodeValue Deep', () => {
    mockLAST_ID = 0

    const encodeDeepExpectations: Expectations = [
        ['Array empty', [], [[ValueType.Array, []]]],
        [
            'Array shallow',
            [1, 1, 4],
            [
                [ValueType.Array, [1, 1, 2]],
                [ValueType.Number, 1],
                [ValueType.Number, 4],
            ],
        ],

        [
            'Array nested',
            [[1, {foo: 'bar'}], 2, {map: new Map()}],
            [
                [ValueType.Array, [1, 5, 6]],
                [ValueType.Array, [2, 3]],
                [ValueType.Number, 1],
                [ValueType.Object, {foo: 4}],
                [ValueType.String, 'bar'],
                [ValueType.Number, 2],
                [ValueType.Object, {map: 7}],
                [ValueType.Instance, 'Map'],
            ],
        ],
        ['Object empty', {}, [[ValueType.Object, {}]]],
        [
            'Object shallow',
            {a: 2, b: 2, c: 4},
            [
                [ValueType.Object, {a: 1, b: 1, c: 2}],
                [ValueType.Number, 2],
                [ValueType.Number, 4],
            ],
        ],
        [
            'Object nested',
            {a: [1, {foo: 'bar'}], b: 2, c: {map: new Map()}},
            [
                [ValueType.Object, {a: 1, b: 5, c: 6}],
                [ValueType.Array, [2, 3]],
                [ValueType.Number, 1],
                [ValueType.Object, {foo: 4}],
                [ValueType.String, 'bar'],
                [ValueType.Number, 2],
                [ValueType.Object, {map: 7}],
                [ValueType.Instance, 'Map'],
            ],
        ],
        [
            'Object with getter properties',
            {
                a: 123,
                get b() {
                    return 456
                },
            },
            [
                [ValueType.Object, {a: 1, b: -1}],
                [ValueType.Number, 123],
            ],
        ],
    ]

    for (const [testName, value, expectation] of encodeDeepExpectations) {
        test(testName, () => {
            const s = encodeValue(value, true)
            expect(s).toEqual(expectation)
            expect(JSON.parse(JSON.stringify(s))).toEqual(s)
        })
    }
})

describe('save elements to a map', () => {
    mockLAST_ID = 0

    const elMapExpectations: Expectations = [
        ['Element div', div1, [[ValueType.Element, '#0:div']]],
        ['Element a', a1, [[ValueType.Element, '#1:a']]],
        [
            'Element in object',
            {el: div2},
            [
                [ValueType.Object, {el: 1}],
                [ValueType.Element, '#4:div'],
            ],
        ],
    ]

    for (const [testName, value, expectation] of elMapExpectations) {
        test(testName, () => {
            const s = encodeValue(value, true)
            expect(s).toEqual(expectation)
            expect(JSON.parse(JSON.stringify(s))).toEqual(s)
        })
    }
    test('map containing correct values', () => {
        expect(getObjectById('#0', ObjectType.Element)).toBe(div1)
        expect(getObjectById('#1', ObjectType.Element)).toBe(a1)
        expect(getObjectById('#4', ObjectType.Element)).toBe(div2)
    })
})

describe('encodeValue with repeated references', () => {
    mockLAST_ID = 0

    const one: any = {a: 1}
    one.b = one
    const two: any = {c: 2}

    const circularExpectations: Expectations = [
        [
            'Repeated reference',
            [[two], {two: two}],
            [
                [ValueType.Array, [1, 4]],
                [ValueType.Array, [2]],
                [ValueType.Object, {c: 3}],
                [ValueType.Number, 2],
                [ValueType.Object, {two: 2}],
            ],
        ],
        [
            'Circular reference',
            one,
            [
                [ValueType.Object, {a: 1, b: 0}],
                [ValueType.Number, 1],
            ],
        ],
        [
            'Circular reference in array',
            [one],
            [
                [ValueType.Array, [1]],
                [ValueType.Object, {a: 2, b: 1}],
                [ValueType.Number, 1],
            ],
        ],
    ]

    for (const [testName, value, expectation] of circularExpectations) {
        test(testName, () => {
            const s = encodeValue(value, true)
            expect(s).toEqual(expectation)
            expect(JSON.parse(JSON.stringify(s))).toEqual(s)
        })
    }
})

describe('finding stores in values', () => {
    mockLAST_ID = 0

    const [state1] = createStore({a: 1})
    const [state2] = createStore({ref: state1})
    const [state3] = createStore({a: 1, b: ['foo']})
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    state3.b[0]

    const [circ, setCirc] = createStore<any>({a: 1})
    setCirc({b: circ})

    const storeExpectations: [
        name: string,
        data: unknown,
        encoded: EncodedValue[],
        calledWith: Parameters<Truthy<Parameters<typeof encodeValue>[2]>>[],
    ][] = [
        [
            'Store',
            state1,
            [
                [ValueType.Store, '#5:1'],
                [ValueType.Object, {a: 2}],
                [ValueType.Number, 1],
            ],
            [[state1, '#5']],
        ],
        [
            'Store in array',
            [state1],
            [
                [ValueType.Array, [1]],
                [ValueType.Store, '#5:2'],
                [ValueType.Object, {a: 3}],
                [ValueType.Number, 1],
            ],
            [[state1, '#5']],
        ],
        [
            'referenced store',
            {state2},
            [
                [ValueType.Object, {state2: 1}],
                [ValueType.Store, '#6:2'],
                [ValueType.Object, {ref: 3}],
                [ValueType.Store, '#5:4'],
                [ValueType.Object, {a: 5}],
                [ValueType.Number, 1],
            ],
            [[state2, '#6']],
        ],
        [
            'nested store',
            state3,
            [
                [ValueType.Store, '#7:1'],
                [ValueType.Object, {a: 2, b: 3}],
                [ValueType.Number, 1],
                [ValueType.Store, '#8:4'],
                [ValueType.Array, [5]],
                [ValueType.String, 'foo'],
            ],
            [[state3, '#7']],
        ],
        [
            'circular store',
            circ,
            [
                [ValueType.Store, '#9:1'],
                [ValueType.Object, {a: 2, b: 0}],
                [ValueType.Number, 1],
            ],
            [[circ, '#9']],
        ],
    ]

    for (const [testName, value, expectation, calledWith] of storeExpectations) {
        test(testName, () => {
            const onStore = vi.fn()
            const s = encodeValue(value, true, onStore)
            expect(s).toEqual(expectation)
            expect(JSON.parse(JSON.stringify(s))).toEqual(s)
            expect(onStore).toBeCalledTimes(calledWith.length)
            for (const args of calledWith) {
                expect(onStore).toBeCalledWith(...args)
            }
        })
    }
})
