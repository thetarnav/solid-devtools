import { describe, test, expect } from 'vitest'
import {
  ValueType,
  INFINITY,
  NEGATIVE_INFINITY,
  NAN,
  encodeValue,
  EncodedValue,
  ElementMap,
} from '../src/serialize'

const _testFunction = () => {}

const encodePreviewExpectations: [string, unknown, EncodedValue<false>][] = [
  ['Infinity', Infinity, { type: ValueType.Number, value: INFINITY }],
  ['Negative Infinity', -Infinity, { type: ValueType.Number, value: NEGATIVE_INFINITY }],
  ['NaN', NaN, { type: ValueType.Number, value: NAN }],
  ['Number', 1, { type: ValueType.Number, value: 1 }],
  ['Boolean true', true, { type: ValueType.Boolean, value: true }],
  ['Boolean false', false, { type: ValueType.Boolean, value: false }],
  ['String', '', { type: ValueType.String, value: '' }],
  ['String', 'foo', { type: ValueType.String, value: 'foo' }],
  ['Null', null, { type: ValueType.Null }],
  ['Undefined', undefined, { type: ValueType.Undefined }],
  ['Named Symbol', Symbol('foo'), { type: ValueType.Symbol, value: 'foo' }],
  ['Symbol', Symbol(), { type: ValueType.Symbol, value: '' }],
  ['Function', () => {}, { type: ValueType.Function, value: '' }],
  ['Named Function', _testFunction, { type: ValueType.Function, value: '_testFunction' }],
  [
    'Element div',
    document.createElement('div'),
    { type: ValueType.Element, value: { name: 'DIV' } },
  ],
  ['Element a', document.createElement('a'), { type: ValueType.Element, value: { name: 'A' } }],
  ['Array empty', [], { type: ValueType.Array, value: 0 }],
  ['Array', [1, 2, 3], { type: ValueType.Array, value: 3 }],
  ['Object empty', {}, { type: ValueType.Object, value: 0 }],
  ['Object', { a: 1, b: 2, c: 3 }, { type: ValueType.Object, value: 3 }],
  ['Date', new Date(), { type: ValueType.Instance, value: 'Date' }],
  ['Error', new Error(), { type: ValueType.Instance, value: 'Error' }],
  ['Map', new Map(), { type: ValueType.Instance, value: 'Map' }],
  ['WeakMap', new WeakMap(), { type: ValueType.Instance, value: 'WeakMap' }],
  ['Set', new Set(), { type: ValueType.Instance, value: 'Set' }],
]

describe('encodeValue Preview', () => {
  for (const [testName, value, expectation] of encodePreviewExpectations) {
    test(testName, () => {
      const s = encodeValue(value, false)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})

const encodeDeepExpectations: [string, unknown, EncodedValue<true>][] = [
  ['Array empty', [], { type: ValueType.Array, value: 0, children: [] }],
  [
    'Array shallow',
    [1, 2, 3],
    {
      type: ValueType.Array,
      value: 3,
      children: [
        { type: ValueType.Number, value: 1 },
        { type: ValueType.Number, value: 2 },
        { type: ValueType.Number, value: 3 },
      ],
    },
  ],
  [
    'Array nested',
    [[1, { foo: 'bar' }], 2, { map: new Map() }],
    {
      type: ValueType.Array,
      value: 3,
      children: [
        {
          type: ValueType.Array,
          value: 2,
          children: [
            { type: ValueType.Number, value: 1 },
            {
              type: ValueType.Object,
              value: 1,
              children: { foo: { type: ValueType.String, value: 'bar' } },
            },
          ],
        },
        { type: ValueType.Number, value: 2 },
        {
          type: ValueType.Object,
          value: 1,
          children: { map: { type: ValueType.Instance, value: 'Map' } },
        },
      ],
    },
  ],
  ['Object empty', {}, { type: ValueType.Object, value: 0, children: {} }],
  [
    'Object shallow',
    { a: 1, b: 2, c: 3 },
    {
      type: ValueType.Object,
      value: 3,
      children: {
        a: { type: ValueType.Number, value: 1 },
        b: { type: ValueType.Number, value: 2 },
        c: { type: ValueType.Number, value: 3 },
      },
    },
  ],
  [
    'Object nested',
    { a: [1, { foo: 'bar' }], b: 2, c: { map: new Map() } },
    {
      type: ValueType.Object,
      value: 3,
      children: {
        a: {
          type: ValueType.Array,
          value: 2,
          children: [
            { type: ValueType.Number, value: 1 },
            {
              type: ValueType.Object,
              value: 1,
              children: { foo: { type: ValueType.String, value: 'bar' } },
            },
          ],
        },
        b: { type: ValueType.Number, value: 2 },
        c: {
          type: ValueType.Object,
          value: 1,
          children: { map: { type: ValueType.Instance, value: 'Map' } },
        },
      },
    },
  ],
  [
    'Object with getter properties',
    {
      a: 123,
      get b() {
        return 456
      },
    },
    {
      type: ValueType.Object,
      value: 2,
      children: {
        a: { type: ValueType.Number, value: 123 },
        b: { type: ValueType.Getter, value: 'b' },
      },
    },
  ],
]

describe('encodeValue Deep', () => {
  for (const [testName, value, expectation] of encodeDeepExpectations) {
    test(testName, () => {
      const s = encodeValue(value, true)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})

describe('save elements to a map', () => {
  const div1 = document.createElement('div')
  const a1 = document.createElement('a')
  const div2 = document.createElement('div')

  const elMapExpectations: [string, unknown, EncodedValue<true>][] = [
    ['Element div', div1, { type: ValueType.Element, value: { name: 'DIV', id: '0' } }],
    ['Element a', a1, { type: ValueType.Element, value: { name: 'A', id: '1' } }],
    [
      'Element in object',
      { el: div2 },
      {
        type: ValueType.Object,
        value: 1,
        children: { el: { type: ValueType.Element, value: { name: 'DIV', id: '2' } } },
      },
    ],
  ]

  const map = new ElementMap()
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
