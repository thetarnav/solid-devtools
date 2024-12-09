import * as debug  from '@solid-devtools/debugger/types'
import * as vi     from 'vitest'
import * as decode from './decode.ts'

type Expectations = [
    name:    string,
    encoded: debug.EncodedValue[],
    decoded: decode.DecodedValue | ((e: decode.DecodedValue) => decode.DecodedValue),
][]

vi.describe('Preview Value', () => {
    const encodePreviewExpectations: Expectations = [
        ['Infinity', [[debug.ValueType.Number, debug.INFINITY]], {type: debug.ValueType.Number, value: Infinity}],
        [
            'Negative Infinity',
            [[debug.ValueType.Number, debug.NEGATIVE_INFINITY]],
            {type: debug.ValueType.Number, value: -Infinity},
        ],
        ['NaN', [[debug.ValueType.Number, debug.NAN]], {type: debug.ValueType.Number, value: NaN}],
        ['Number', [[debug.ValueType.Number, 1]], {type: debug.ValueType.Number, value: 1}],
        ['Boolean true', [[debug.ValueType.Boolean, true]], {type: debug.ValueType.Boolean, value: true}],
        ['Boolean false', [[debug.ValueType.Boolean, false]], {type: debug.ValueType.Boolean, value: false}],
        ['Empty String', [[debug.ValueType.String, '']], {type: debug.ValueType.String, value: ''}],
        ['String', [[debug.ValueType.String, 'foo']], {type: debug.ValueType.String, value: 'foo'}],
        ['Null', [[debug.ValueType.Null, null]], {type: debug.ValueType.Null, value: null}],
        ['Undefined', [[debug.ValueType.Null, debug.UNDEFINED]], {type: debug.ValueType.Null, value: undefined}],
        ['Named Symbol', [[debug.ValueType.Symbol, 'foo']], {type: debug.ValueType.Symbol, name: 'foo'}],
        ['Symbol', [[debug.ValueType.Symbol, '']], {type: debug.ValueType.Symbol, name: ''}],
        ['Function', [[debug.ValueType.Function, '']], {type: debug.ValueType.Function, name: ''}],
        [
            'Named Function',
            [[debug.ValueType.Function, '_testFunction']],
            {type: debug.ValueType.Function, name: '_testFunction'},
        ],
        [
            'Element div',
            [[debug.ValueType.Element, '#0:div']],
            {type: debug.ValueType.Element, name: 'div', id: '#0'},
        ],
        [
            'Element a',
            [[debug.ValueType.Element, '#1:a']],
            {type: debug.ValueType.Element, name: 'a', id: '#1'},
        ],
        [
            'Array empty',
            [[debug.ValueType.Array, 0]],
            {type: debug.ValueType.Array, length: 0, value: null, setValue: vi.expect.any(Function)},
        ],
        [
            'Array',
            [[debug.ValueType.Array, 3]],
            {type: debug.ValueType.Array, length: 3, value: null, setValue: vi.expect.any(Function)},
        ],
        [
            'Object empty',
            [[debug.ValueType.Object, 0]],
            {type: debug.ValueType.Object, value: null, length: 0, setValue: vi.expect.any(Function)},
        ],
        [
            'Object',
            [[debug.ValueType.Object, 3]],
            {type: debug.ValueType.Object, value: null, length: 3, setValue: vi.expect.any(Function)},
        ],
        ['Date', [[debug.ValueType.Instance, 'Date']], {type: debug.ValueType.Instance, name: 'Date'}],
        ['Error', [[debug.ValueType.Instance, 'Error']], {type: debug.ValueType.Instance, name: 'Error'}],
        ['Map', [[debug.ValueType.Instance, 'Map']], {type: debug.ValueType.Instance, name: 'Map'}],
        ['WeakMap', [[debug.ValueType.Instance, 'WeakMap']], {type: debug.ValueType.Instance, name: 'WeakMap'}],
        ['Set', [[debug.ValueType.Instance, 'Set']], {type: debug.ValueType.Instance, name: 'Set'}],
        [
            'Store',
            [
                [debug.ValueType.Store, '#2:1'],
                [debug.ValueType.Object, 3],
            ],
            {
                type: debug.ValueType.Store,
                id: '#2',
                valueType: debug.ValueType.Object,
                value: null,
                length: 3,
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Mutable',
            [
                [debug.ValueType.Store, '#3:1'],
                [debug.ValueType.Object, 3],
            ],
            {
                type: debug.ValueType.Store,
                id: '#3',
                valueType: debug.ValueType.Object,
                value: null,
                length: 3,
                setValue: vi.expect.any(Function),
            },
        ],
    ]

    for (const [testName, value, expectation] of encodePreviewExpectations) {
        vi.test(testName, () => {
            const s = decode.decodeValue(value, null, new decode.StoreNodeMap())
            vi.expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
        })
    }
})

vi.describe('deep values', () => {
    const encodeDeepExpectations: Expectations = [
        [
            'Array empty',
            [[debug.ValueType.Array, []]],
            {
                type: debug.ValueType.Array,
                length: 0,
                value: [] as any[],
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Array shallow',
            [
                [debug.ValueType.Array, [1, 1, 2]],
                [debug.ValueType.Number, 1],
                [debug.ValueType.Number, 4],
            ],
            {
                type: debug.ValueType.Array,
                length: 3,
                value: [
                    {type: debug.ValueType.Number, value: 1},
                    {type: debug.ValueType.Number, value: 1},
                    {type: debug.ValueType.Number, value: 4},
                ],
                setValue: vi.expect.any(Function),
            },
        ],

        [
            'Array nested',
            [
                [debug.ValueType.Array, [1, 5, 6]],
                [debug.ValueType.Array, [2, 3]],
                [debug.ValueType.Number, 1],
                [debug.ValueType.Object, {foo: 4}],
                [debug.ValueType.String, 'bar'],
                [debug.ValueType.Number, 2],
                [debug.ValueType.Object, {map: 7}],
                [debug.ValueType.Instance, 'Map'],
            ],
            {
                type: debug.ValueType.Array,
                length: 3,
                value: [
                    {
                        type: debug.ValueType.Array,
                        length: 2,
                        value: [
                            {type: debug.ValueType.Number, value: 1},
                            {
                                type: debug.ValueType.Object,
                                length: 1,
                                value: {foo: {type: debug.ValueType.String, value: 'bar'}},
                                setValue: vi.expect.any(Function),
                            },
                        ],
                        setValue: vi.expect.any(Function),
                    },
                    {type: debug.ValueType.Number, value: 2},
                    {
                        type: debug.ValueType.Object,
                        length: 1,
                        value: {map: {type: debug.ValueType.Instance, name: 'Map'}},
                        setValue: vi.expect.any(Function),
                    },
                ],
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Object empty',
            [[debug.ValueType.Object, {}]],
            {type: debug.ValueType.Object, length: 0, value: {}, setValue: vi.expect.any(Function)},
        ],
        [
            'Object shallow',
            [
                [debug.ValueType.Object, {a: 1, b: 1, c: 2}],
                [debug.ValueType.Number, 2],
                [debug.ValueType.Number, 4],
            ],
            {
                type: debug.ValueType.Object,
                length: 3,
                value: {
                    a: {type: debug.ValueType.Number, value: 2},
                    b: {type: debug.ValueType.Number, value: 2},
                    c: {type: debug.ValueType.Number, value: 4},
                },
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Object nested',
            [
                [debug.ValueType.Object, {a: 1, b: 5, c: 6}],
                [debug.ValueType.Array, [2, 3]],
                [debug.ValueType.Number, 1],
                [debug.ValueType.Object, {foo: 4}],
                [debug.ValueType.String, 'bar'],
                [debug.ValueType.Number, 2],
                [debug.ValueType.Object, {map: 7}],
                [debug.ValueType.Instance, 'Map'],
            ],
            {
                type: debug.ValueType.Object,
                length: 3,
                value: {
                    a: {
                        type: debug.ValueType.Array,
                        length: 2,
                        value: [
                            {type: debug.ValueType.Number, value: 1},
                            {
                                type: debug.ValueType.Object,
                                length: 1,
                                value: {foo: {type: debug.ValueType.String, value: 'bar'}},
                                setValue: vi.expect.any(Function),
                            },
                        ],
                        setValue: vi.expect.any(Function),
                    },
                    b: {type: debug.ValueType.Number, value: 2},
                    c: {
                        type: debug.ValueType.Object,
                        length: 1,
                        value: {map: {type: debug.ValueType.Instance, name: 'Map'}},
                        setValue: vi.expect.any(Function),
                    },
                },
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Object with getter properties',
            [
                [debug.ValueType.Object, {a: 1, b: -1}],
                [debug.ValueType.Number, 123],
            ],
            {
                type: debug.ValueType.Object,
                length: 2,
                value: {
                    a: {type: debug.ValueType.Number, value: 123},
                    b: {type: debug.ValueType.Getter, name: 'b'},
                },
                setValue: vi.expect.any(Function),
            },
        ],
    ]

    for (const [testName, value, expectation] of encodeDeepExpectations) {
        vi.test(testName, () => {
            const s = decode.decodeValue(value, null, new decode.StoreNodeMap())
            vi.expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
        })
    }
})

vi.describe('repeated references', () => {
    const circularExpectations: Expectations = [
        [
            'Repeated reference',
            [
                [debug.ValueType.Array, [1, 4]],
                [debug.ValueType.Array, [2]],
                [debug.ValueType.Object, {c: 3}],
                [debug.ValueType.Number, 2],
                [debug.ValueType.Object, {two: 2}],
            ],
            {
                type: debug.ValueType.Array,
                length: 2,
                value: [
                    {
                        type: debug.ValueType.Array,
                        length: 1,
                        value: [
                            {
                                type: debug.ValueType.Object,
                                length: 1,
                                value: {c: {type: debug.ValueType.Number, value: 2}},
                                setValue: vi.expect.any(Function),
                            },
                        ],
                        setValue: vi.expect.any(Function),
                    },
                    {
                        type: debug.ValueType.Object,
                        length: 1,
                        value: {
                            two: {
                                type: debug.ValueType.Object,
                                length: 1,
                                value: {c: {type: debug.ValueType.Number, value: 2}},
                                setValue: vi.expect.any(Function),
                            },
                        },
                        setValue: vi.expect.any(Function),
                    },
                ],
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Circular reference',
            [
                [debug.ValueType.Object, {a: 1, b: 0}],
                [debug.ValueType.Number, 1],
            ],
            (s: any) => {
                const topObject: decode.DecodedValue<debug.ValueType.Object> = {
                    type: debug.ValueType.Object,
                    setValue: s.setValue,
                    length: 2,
                    value: {a: {type: debug.ValueType.Number, value: 1}},
                }

                // @ts-ignore
                topObject.value.b = topObject

                return topObject
            },
        ],
        [
            'Circular reference in array',
            [
                [debug.ValueType.Array, [1]],
                [debug.ValueType.Object, {a: 2, b: 1}],
                [debug.ValueType.Number, 1],
            ],
            (s: any) => {
                const topArray: decode.DecodedValue<debug.ValueType.Array> = {
                    type: debug.ValueType.Array,
                    setValue: s.setValue,
                    length: 1,
                    value: [
                        {
                            type: debug.ValueType.Object,
                            setValue: s.value[0].setValue,
                            length: 2,
                            value: {a: {type: debug.ValueType.Number, value: 1}},
                        },
                    ],
                }

                // @ts-ignore
                topArray.value[0].value.b = topArray.value[0]

                return topArray
            },
        ],
    ]

    for (const [testName, value, expectation] of circularExpectations) {
        vi.test(testName, () => {
            const s = decode.decodeValue(value, null, new decode.StoreNodeMap())
            vi.expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
        })
    }
})

vi.describe('finding stores in values', () => {
    const storeExpectations: Expectations = [
        [
            'Store',
            [
                [debug.ValueType.Store, '#5:1'],
                [debug.ValueType.Object, {a: 2}],
                [debug.ValueType.Number, 1],
            ],
            {
                type: debug.ValueType.Store,
                id: '#5',
                valueType: debug.ValueType.Object,
                length: 1,
                value: {a: {type: debug.ValueType.Number, value: 1}},
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'Store in array',
            [
                [debug.ValueType.Array, [1]],
                [debug.ValueType.Store, '#5:2'],
                [debug.ValueType.Object, {a: 3}],
                [debug.ValueType.Number, 1],
            ],
            {
                type: debug.ValueType.Array,
                length: 1,
                value: [
                    {
                        type: debug.ValueType.Store,
                        id: '#5',
                        valueType: debug.ValueType.Object,
                        length: 1,
                        value: {a: {type: debug.ValueType.Number, value: 1}},
                        setValue: vi.expect.any(Function),
                    },
                ],
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'referenced store',
            [
                [debug.ValueType.Object, {state2: 1}],
                [debug.ValueType.Store, '#6:2'],
                [debug.ValueType.Object, {ref: 3}],
                [debug.ValueType.Store, '#5:4'],
                [debug.ValueType.Object, {a: 5}],
                [debug.ValueType.Number, 1],
            ],
            {
                type: debug.ValueType.Object,
                length: 1,
                value: {
                    state2: {
                        type: debug.ValueType.Store,
                        id: '#6',
                        valueType: debug.ValueType.Object,
                        length: 1,
                        value: {
                            ref: {
                                type: debug.ValueType.Store,
                                id: '#5',
                                valueType: debug.ValueType.Object,
                                length: 1,
                                value: vi.expect.any(Object),
                                setValue: vi.expect.any(Function),
                            },
                        },
                        setValue: vi.expect.any(Function),
                    },
                },
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'nested store',
            [
                [debug.ValueType.Store, '#7:1'],
                [debug.ValueType.Object, {a: 2, b: 3}],
                [debug.ValueType.Number, 1],
                [debug.ValueType.Store, '#8:4'],
                [debug.ValueType.Array, [5]],
                [debug.ValueType.String, 'foo'],
            ],
            {
                type: debug.ValueType.Store,
                id: '#7',
                valueType: debug.ValueType.Object,
                length: 2,
                value: {
                    a: {type: debug.ValueType.Number, value: 1},
                    b: {
                        type: debug.ValueType.Store,
                        id: '#8',
                        valueType: debug.ValueType.Array,
                        length: 1,
                        value: [{type: debug.ValueType.String, value: 'foo'}],
                        setValue: vi.expect.any(Function),
                    },
                },
                setValue: vi.expect.any(Function),
            },
        ],
        [
            'circular store',
            [
                [debug.ValueType.Store, '#9:1'],
                [debug.ValueType.Object, {a: 2, b: 0}],
                [debug.ValueType.Number, 1],
            ],
            (s: any) => {
                const topObject: decode.DecodedValue<debug.ValueType.Store> = {
                    type: debug.ValueType.Store,
                    id: '#9',
                    valueType: debug.ValueType.Object,
                    length: 2,
                    value: {a: {type: debug.ValueType.Number, value: 1}},
                    setValue: s.setValue,
                }

                // @ts-ignore
                topObject.value.b = topObject

                return topObject
            },
        ],
    ]

    for (const [testName, value, expectation] of storeExpectations) {
        vi.test(testName, () => {
            const s = decode.decodeValue(value, null, new decode.StoreNodeMap())
            vi.expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
        })
    }
})
