import { createMutable, createStore } from 'solid-js/store'
import { describe, test, expect, vi } from 'vitest'
import { EncodedValue, INFINITY, NAN, NEGATIVE_INFINITY, UNDEFINED, ValueType } from '../serialize'

const getModule = async () => {
  vi.resetModules()
  return await import('../serialize')
}

type Expectations = [name: string, data: unknown, encoded: EncodedValue[]][]

describe('encodeValue Preview', async () => {
  const { encodeValue, NodeIDMap } = await getModule()

  const _testFunction = () => {}

  const [state] = createStore({ a: 1, b: 2, c: 3 })
  const mutable = createMutable({ a: 1, b: 2, c: 3 })

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
    ['Function', () => {}, [[ValueType.Function, '']]],
    ['Named Function', _testFunction, [[ValueType.Function, '_testFunction']]],
    ['Element div', document.createElement('div'), [[ValueType.Element, { name: 'div', id: '0' }]]],
    ['Element a', document.createElement('a'), [[ValueType.Element, { name: 'a', id: '1' }]]],
    ['Array empty', [], [[ValueType.Array, 0]]],
    ['Array', [1, 2, 3], [[ValueType.Array, 3]]],
    ['Object empty', {}, [[ValueType.Object, 0]]],
    ['Object', { a: 1, b: 2, c: 3 }, [[ValueType.Object, 3]]],
    ['Date', new Date(), [[ValueType.Instance, 'Date']]],
    ['Error', new Error(), [[ValueType.Instance, 'Error']]],
    ['Map', new Map(), [[ValueType.Instance, 'Map']]],
    ['WeakMap', new WeakMap(), [[ValueType.Instance, 'WeakMap']]],
    ['Set', new Set(), [[ValueType.Instance, 'Set']]],
    [
      'Store',
      state,
      [
        [ValueType.Store, { id: '2', value: 1 }],
        [ValueType.Object, 3],
      ],
    ],
    [
      'Mutable',
      mutable,
      [
        [ValueType.Store, { id: '3', value: 1 }],
        [ValueType.Object, 3],
      ],
    ],
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
      [[1, { foo: 'bar' }], 2, { map: new Map() }],
      [
        [ValueType.Array, [1, 5, 6]],
        [ValueType.Array, [2, 3]],
        [ValueType.Number, 1],
        [ValueType.Object, { foo: 4 }],
        [ValueType.String, 'bar'],
        [ValueType.Number, 2],
        [ValueType.Object, { map: 7 }],
        [ValueType.Instance, 'Map'],
      ],
    ],
    ['Object empty', {}, [[ValueType.Object, {}]]],
    [
      'Object shallow',
      { a: 2, b: 2, c: 4 },
      [
        [ValueType.Object, { a: 1, b: 1, c: 2 }],
        [ValueType.Number, 2],
        [ValueType.Number, 4],
      ],
    ],
    [
      'Object nested',
      { a: [1, { foo: 'bar' }], b: 2, c: { map: new Map() } },
      [
        [ValueType.Object, { a: 1, b: 5, c: 6 }],
        [ValueType.Array, [2, 3]],
        [ValueType.Number, 1],
        [ValueType.Object, { foo: 4 }],
        [ValueType.String, 'bar'],
        [ValueType.Number, 2],
        [ValueType.Object, { map: 7 }],
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
        [ValueType.Object, { a: 1, b: -1 }],
        [ValueType.Number, 123],
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

  const elMapExpectations: Expectations = [
    ['Element div', div1, [[ValueType.Element, { name: 'div', id: '0' }]]],
    ['Element a', a1, [[ValueType.Element, { name: 'a', id: '1' }]]],
    [
      'Element in object',
      { el: div2 },
      [
        [ValueType.Object, { el: 1 }],
        [ValueType.Element, { name: 'div', id: '2' }],
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

  const circularExpectations: Expectations = [
    [
      'Repeated reference',
      [[two], { two: two }],
      [
        [ValueType.Array, [1, 4]],
        [ValueType.Array, [2]],
        [ValueType.Object, { c: 3 }],
        [ValueType.Number, 2],
        [ValueType.Object, { two: 2 }],
      ],
    ],
    [
      'Circular reference',
      one,
      [
        [ValueType.Object, { a: 1, b: 0 }],
        [ValueType.Number, 1],
      ],
    ],
    [
      'Circular reference in array',
      [one],
      [
        [ValueType.Array, [1]],
        [ValueType.Object, { a: 2, b: 1 }],
        [ValueType.Number, 1],
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
    data: unknown,
    encoded: EncodedValue[],
    calledWith: Parameters<NonNullable<Parameters<typeof encodeValue>[3]>>[],
  ][] = [
    [
      'Store',
      state,
      [
        [ValueType.Store, { value: 1, id: '0' }],
        [ValueType.Object, { a: 2 }],
        [ValueType.Number, 1],
      ],
      [['0', state]],
    ],
    [
      'Store in array',
      [state],
      [
        [ValueType.Array, [1]],
        [ValueType.Store, { value: 2, id: '1' }],
        [ValueType.Object, { a: 3 }],
        [ValueType.Number, 1],
      ],
      [['1', state]],
    ],
    [
      'nested store',
      { state2 },
      [
        [ValueType.Object, { state2: 1 }],
        [ValueType.Store, { value: 2, id: '2' }],
        [ValueType.Object, { nested: 3 }],
        [ValueType.Object, { a: 4 }],
        [ValueType.Number, 1],
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
