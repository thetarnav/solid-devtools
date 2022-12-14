import { createStore } from 'solid-js/store'
import { describe, test, expect, vi } from 'vitest'
import { EncodedValue, INFINITY, NAN, NEGATIVE_INFINITY, ValueType } from '../../types'

const getModule = async () => {
  vi.resetModules()
  return await import('../serialize')
}

type Expectations<Deep extends boolean> = [
  name: string,
  value: unknown,
  encoded: EncodedValue<Deep>[],
][]

describe('encodeValue Preview', async () => {
  const { encodeValue, NodeIDMap } = await getModule()

  const _testFunction = () => {}

  const encodePreviewExpectations: Expectations<false> = [
    ['Infinity', Infinity, [{ type: ValueType.Number, value: INFINITY }]],
    ['Negative Infinity', -Infinity, [{ type: ValueType.Number, value: NEGATIVE_INFINITY }]],
    ['NaN', NaN, [{ type: ValueType.Number, value: NAN }]],
    ['Number', 1, [{ type: ValueType.Number, value: 1 }]],
    ['Boolean true', true, [{ type: ValueType.Boolean, value: true }]],
    ['Boolean false', false, [{ type: ValueType.Boolean, value: false }]],
    ['String', '', [{ type: ValueType.String, value: '' }]],
    ['String', 'foo', [{ type: ValueType.String, value: 'foo' }]],
    ['Null', null, [{ type: ValueType.Null }]],
    ['Undefined', undefined, [{ type: ValueType.Undefined }]],
    ['Named Symbol', Symbol('foo'), [{ type: ValueType.Symbol, value: 'foo' }]],
    ['Symbol', Symbol(), [{ type: ValueType.Symbol, value: '' }]],
    ['Function', () => {}, [{ type: ValueType.Function, value: '' }]],
    ['Named Function', _testFunction, [{ type: ValueType.Function, value: '_testFunction' }]],
    [
      'Element div',
      document.createElement('div'),
      [{ type: ValueType.Element, value: { name: 'div', id: '0' } }],
    ],
    [
      'Element a',
      document.createElement('a'),
      [{ type: ValueType.Element, value: { name: 'a', id: '1' } }],
    ],
    ['Array empty', [], [{ type: ValueType.Array, value: 0 }]],
    ['Array', [1, 2, 3], [{ type: ValueType.Array, value: 3 }]],
    ['Object empty', {}, [{ type: ValueType.Object, value: 0 }]],
    ['Object', { a: 1, b: 2, c: 3 }, [{ type: ValueType.Object, value: 3 }]],
    ['Date', new Date(), [{ type: ValueType.Instance, value: 'Date' }]],
    ['Error', new Error(), [{ type: ValueType.Instance, value: 'Error' }]],
    ['Map', new Map(), [{ type: ValueType.Instance, value: 'Map' }]],
    ['WeakMap', new WeakMap(), [{ type: ValueType.Instance, value: 'WeakMap' }]],
    ['Set', new Set(), [{ type: ValueType.Instance, value: 'Set' }]],
  ]

  for (const [testName, value, expectation] of encodePreviewExpectations) {
    test(testName, () => {
      const s = encodeValue(value, false, new NodeIDMap())
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})

describe('encodeValue Deep', async () => {
  const { encodeValue, NodeIDMap } = await getModule()

  const encodeDeepExpectations: Expectations<true> = [
    ['Array empty', [], [{ type: ValueType.Array, value: 0, children: [] }]],
    [
      'Array shallow',
      [1, 2, 4],
      [
        {
          type: ValueType.Array,
          value: 3,
          children: [1, 2, 3],
        },
        { type: ValueType.Number, value: 1 },
        { type: ValueType.Number, value: 2 },
        { type: ValueType.Number, value: 4 },
      ],
    ],

    [
      'Array nested',
      [[1, { foo: 'bar' }], 2, { map: new Map() }],
      [
        {
          type: ValueType.Array,
          value: 3,
          children: [1, 5, 6],
        },
        {
          type: ValueType.Array,
          value: 2,
          children: [2, 3],
        },
        { type: ValueType.Number, value: 1 },
        {
          type: ValueType.Object,
          value: 1,
          children: { foo: 4 },
        },
        { type: ValueType.String, value: 'bar' },
        { type: ValueType.Number, value: 2 },
        {
          type: ValueType.Object,
          value: 1,
          children: { map: 7 },
        },
        { type: ValueType.Instance, value: 'Map' },
      ],
    ],
    ['Object empty', {}, [{ type: ValueType.Object, value: 0, children: {} }]],
    [
      'Object shallow',
      { a: 1, b: 2, c: 4 },
      [
        {
          type: ValueType.Object,
          value: 3,
          children: { a: 1, b: 2, c: 3 },
        },
        { type: ValueType.Number, value: 1 },
        { type: ValueType.Number, value: 2 },
        { type: ValueType.Number, value: 4 },
      ],
    ],
    [
      'Object nested',
      { a: [1, { foo: 'bar' }], b: 2, c: { map: new Map() } },
      [
        {
          type: ValueType.Object,
          value: 3,
          children: { a: 1, b: 5, c: 6 },
        },
        {
          type: ValueType.Array,
          value: 2,
          children: [2, 3],
        },
        { type: ValueType.Number, value: 1 },
        {
          type: ValueType.Object,
          value: 1,
          children: { foo: 4 },
        },
        { type: ValueType.String, value: 'bar' },
        { type: ValueType.Number, value: 2 },
        {
          type: ValueType.Object,
          value: 1,
          children: { map: 7 },
        },
        { type: ValueType.Instance, value: 'Map' },
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
        {
          type: ValueType.Object,
          value: 2,
          children: { a: 1, b: -1 },
        },
        { type: ValueType.Number, value: 123 },
      ],
    ],
  ]

  for (const [testName, value, expectation] of encodeDeepExpectations) {
    test(testName, () => {
      const s = encodeValue(value, true, new NodeIDMap())
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})

describe('save elements to a map', async () => {
  const { encodeValue, NodeIDMap } = await getModule()

  const div1 = document.createElement('div')
  const a1 = document.createElement('a')
  const div2 = document.createElement('div')

  const elMapExpectations: Expectations<true> = [
    ['Element div', div1, [{ type: ValueType.Element, value: { name: 'div', id: '0' } }]],
    ['Element a', a1, [{ type: ValueType.Element, value: { name: 'a', id: '1' } }]],
    [
      'Element in object',
      { el: div2 },
      [
        {
          type: ValueType.Object,
          value: 1,
          children: { el: 1 },
        },
        { type: ValueType.Element, value: { name: 'div', id: '2' } },
      ],
    ],
  ]

  const map = new NodeIDMap()
  for (const [testName, value, expectation] of elMapExpectations) {
    test(testName, () => {
      const s = encodeValue(value, true, map)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
  test('map containing correct values', () => {
    expect(map.get('0')).toBe(div1)
    expect(map.get('1')).toBe(a1)
    expect(map.get('2')).toBe(div2)
  })
})

describe('encodeValue with repeated references', async () => {
  const { encodeValue, NodeIDMap } = await getModule()

  const one: any = { a: 1 }
  one.b = one
  const two: any = { c: 2 }

  const circularExpectations: Expectations<true> = [
    [
      'Repeated reference',
      [[two], { two: two }],
      [
        {
          type: ValueType.Array,
          value: 2,
          children: [1, 4],
        },
        {
          type: ValueType.Array,
          value: 1,
          children: [2],
        },
        {
          type: ValueType.Object,
          value: 1,
          children: { c: 3 },
        },
        { type: ValueType.Number, value: 2 },
        {
          type: ValueType.Object,
          value: 1,
          children: { two: 2 },
        },
      ],
    ],
    [
      'Circular reference',
      one,
      [
        {
          type: ValueType.Object,
          value: 2,
          children: { a: 1, b: 0 },
        },
        { type: ValueType.Number, value: 1 },
      ],
    ],
    [
      'Circular reference in array',
      [one],
      [
        {
          type: ValueType.Array,
          value: 1,
          children: [1],
        },
        {
          type: ValueType.Object,
          value: 2,
          children: { a: 2, b: 1 },
        },
        { type: ValueType.Number, value: 1 },
      ],
    ],
  ]

  for (const [testName, value, expectation] of circularExpectations) {
    test(testName, () => {
      const s = encodeValue(value, true, new NodeIDMap())
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})

describe('finding stores in values', async () => {
  const { encodeValue, NodeIDMap } = await getModule()

  const [state] = createStore({ a: 1 })
  const [state2] = createStore({ nested: state })

  const storeExpectations: [
    name: string,
    value: unknown,
    encoded: EncodedValue<true>[],
    calledWith: Parameters<NonNullable<Parameters<typeof encodeValue>[3]>>[],
  ][] = [
    [
      'Store',
      state,
      [
        {
          type: ValueType.Store,
          value: { value: 1, id: '0' },
        },
        {
          type: ValueType.Object,
          value: 1,
          children: { a: 2 },
        },
        { type: ValueType.Number, value: 1 },
      ],
      [['0', state]],
    ],
    [
      'Store in array',
      [state],
      [
        {
          type: ValueType.Array,
          value: 1,
          children: [1],
        },
        {
          type: ValueType.Store,
          value: { value: 2, id: '1' },
        },
        {
          type: ValueType.Object,
          value: 1,
          children: { a: 3 },
        },
        { type: ValueType.Number, value: 1 },
      ],
      [['1', state]],
    ],
    [
      'nested store',
      { state2 },
      [
        {
          type: ValueType.Object,
          value: 1,
          children: { state2: 1 },
        },
        {
          type: ValueType.Store,
          value: { value: 2, id: '2' },
        },
        {
          type: ValueType.Object,
          value: 1,
          children: { nested: 3 },
        },
        {
          type: ValueType.Object,
          value: 1,
          children: { a: 4 },
        },
        { type: ValueType.Number, value: 1 },
      ],
      [['2', state2]],
    ],
  ]

  for (const [testName, value, expectation, calledWith] of storeExpectations) {
    test(testName, () => {
      const onStore = vi.fn()
      const s = encodeValue(value, true, new NodeIDMap(), onStore)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
      expect(onStore).toBeCalledTimes(calledWith.length)
      for (const args of calledWith) {
        expect(onStore).toBeCalledWith(...args)
      }
    })
  }
})
