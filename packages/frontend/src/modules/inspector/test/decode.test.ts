import {
  EncodedValue,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  UNDEFINED,
  ValueType,
} from '@solid-devtools/debugger/types'
import { describe, expect, test } from 'vitest'
import { DecodedValue, decodeValue, StoreNodeMap } from '../decode'

type Expectations = [
  name: string,
  encoded: EncodedValue[],
  decoded: DecodedValue | ((e: DecodedValue) => DecodedValue),
][]

describe('Preview Value', () => {
  const encodePreviewExpectations: Expectations = [
    ['Infinity', [[ValueType.Number, INFINITY]], { type: ValueType.Number, value: Infinity }],
    [
      'Negative Infinity',
      [[ValueType.Number, NEGATIVE_INFINITY]],
      { type: ValueType.Number, value: -Infinity },
    ],
    ['NaN', [[ValueType.Number, NAN]], { type: ValueType.Number, value: NaN }],
    ['Number', [[ValueType.Number, 1]], { type: ValueType.Number, value: 1 }],
    ['Boolean true', [[ValueType.Boolean, true]], { type: ValueType.Boolean, value: true }],
    ['Boolean false', [[ValueType.Boolean, false]], { type: ValueType.Boolean, value: false }],
    ['Empty String', [[ValueType.String, '']], { type: ValueType.String, value: '' }],
    ['String', [[ValueType.String, 'foo']], { type: ValueType.String, value: 'foo' }],
    ['Null', [[ValueType.Null, null]], { type: ValueType.Null, value: null }],
    ['Undefined', [[ValueType.Null, UNDEFINED]], { type: ValueType.Null, value: undefined }],
    ['Named Symbol', [[ValueType.Symbol, 'foo']], { type: ValueType.Symbol, name: 'foo' }],
    ['Symbol', [[ValueType.Symbol, '']], { type: ValueType.Symbol, name: '' }],
    ['Function', [[ValueType.Function, '']], { type: ValueType.Function, name: '' }],
    [
      'Named Function',
      [[ValueType.Function, '_testFunction']],
      { type: ValueType.Function, name: '_testFunction' },
    ],
    [
      'Element div',
      [[ValueType.Element, '#0:div']],
      { type: ValueType.Element, name: 'div', id: '#0' },
    ],
    ['Element a', [[ValueType.Element, '#1:a']], { type: ValueType.Element, name: 'a', id: '#1' }],
    [
      'Array empty',
      [[ValueType.Array, 0]],
      { type: ValueType.Array, length: 0, value: null, setValue: expect.any(Function) },
    ],
    [
      'Array',
      [[ValueType.Array, 3]],
      { type: ValueType.Array, length: 3, value: null, setValue: expect.any(Function) },
    ],
    [
      'Object empty',
      [[ValueType.Object, 0]],
      { type: ValueType.Object, value: null, length: 0, setValue: expect.any(Function) },
    ],
    [
      'Object',
      [[ValueType.Object, 3]],
      { type: ValueType.Object, value: null, length: 3, setValue: expect.any(Function) },
    ],
    ['Date', [[ValueType.Instance, 'Date']], { type: ValueType.Instance, name: 'Date' }],
    ['Error', [[ValueType.Instance, 'Error']], { type: ValueType.Instance, name: 'Error' }],
    ['Map', [[ValueType.Instance, 'Map']], { type: ValueType.Instance, name: 'Map' }],
    ['WeakMap', [[ValueType.Instance, 'WeakMap']], { type: ValueType.Instance, name: 'WeakMap' }],
    ['Set', [[ValueType.Instance, 'Set']], { type: ValueType.Instance, name: 'Set' }],
    [
      'Store',
      [
        [ValueType.Store, '#2:1'],
        [ValueType.Object, 3],
      ],
      {
        type: ValueType.Store,
        id: '#2',
        valueType: ValueType.Object,
        value: null,
        length: 3,
        setValue: expect.any(Function),
      },
    ],
    [
      'Mutable',
      [
        [ValueType.Store, '#3:1'],
        [ValueType.Object, 3],
      ],
      {
        type: ValueType.Store,
        id: '#3',
        valueType: ValueType.Object,
        value: null,
        length: 3,
        setValue: expect.any(Function),
      },
    ],
  ]

  for (const [testName, value, expectation] of encodePreviewExpectations) {
    test(testName, () => {
      const s = decodeValue(value, null, new StoreNodeMap())
      expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
    })
  }
})

describe('deep values', () => {
  const encodeDeepExpectations: Expectations = [
    [
      'Array empty',
      [[ValueType.Array, []]],
      { type: ValueType.Array, length: 0, value: [] as any[], setValue: expect.any(Function) },
    ],
    [
      'Array shallow',
      [
        [ValueType.Array, [1, 1, 2]],
        [ValueType.Number, 1],
        [ValueType.Number, 4],
      ],
      {
        type: ValueType.Array,
        length: 3,
        value: [
          { type: ValueType.Number, value: 1 },
          { type: ValueType.Number, value: 1 },
          { type: ValueType.Number, value: 4 },
        ],
        setValue: expect.any(Function),
      },
    ],

    [
      'Array nested',
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
      {
        type: ValueType.Array,
        length: 3,
        value: [
          {
            type: ValueType.Array,
            length: 2,
            value: [
              { type: ValueType.Number, value: 1 },
              {
                type: ValueType.Object,
                length: 1,
                value: { foo: { type: ValueType.String, value: 'bar' } },
                setValue: expect.any(Function),
              },
            ],
            setValue: expect.any(Function),
          },
          { type: ValueType.Number, value: 2 },
          {
            type: ValueType.Object,
            length: 1,
            value: { map: { type: ValueType.Instance, name: 'Map' } },
            setValue: expect.any(Function),
          },
        ],
        setValue: expect.any(Function),
      },
    ],
    [
      'Object empty',
      [[ValueType.Object, {}]],
      { type: ValueType.Object, length: 0, value: {}, setValue: expect.any(Function) },
    ],
    [
      'Object shallow',
      [
        [ValueType.Object, { a: 1, b: 1, c: 2 }],
        [ValueType.Number, 2],
        [ValueType.Number, 4],
      ],
      {
        type: ValueType.Object,
        length: 3,
        value: {
          a: { type: ValueType.Number, value: 2 },
          b: { type: ValueType.Number, value: 2 },
          c: { type: ValueType.Number, value: 4 },
        },
        setValue: expect.any(Function),
      },
    ],
    [
      'Object nested',
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
      {
        type: ValueType.Object,
        length: 3,
        value: {
          a: {
            type: ValueType.Array,
            length: 2,
            value: [
              { type: ValueType.Number, value: 1 },
              {
                type: ValueType.Object,
                length: 1,
                value: { foo: { type: ValueType.String, value: 'bar' } },
                setValue: expect.any(Function),
              },
            ],
            setValue: expect.any(Function),
          },
          b: { type: ValueType.Number, value: 2 },
          c: {
            type: ValueType.Object,
            length: 1,
            value: { map: { type: ValueType.Instance, name: 'Map' } },
            setValue: expect.any(Function),
          },
        },
        setValue: expect.any(Function),
      },
    ],
    [
      'Object with getter properties',
      [
        [ValueType.Object, { a: 1, b: -1 }],
        [ValueType.Number, 123],
      ],
      {
        type: ValueType.Object,
        length: 2,
        value: {
          a: { type: ValueType.Number, value: 123 },
          b: { type: ValueType.Getter, name: 'b' },
        },
        setValue: expect.any(Function),
      },
    ],
  ]

  for (const [testName, value, expectation] of encodeDeepExpectations) {
    test(testName, () => {
      const s = decodeValue(value, null, new StoreNodeMap())
      expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
    })
  }
})

describe('repeated references', () => {
  const circularExpectations: Expectations = [
    [
      'Repeated reference',
      [
        [ValueType.Array, [1, 4]],
        [ValueType.Array, [2]],
        [ValueType.Object, { c: 3 }],
        [ValueType.Number, 2],
        [ValueType.Object, { two: 2 }],
      ],
      {
        type: ValueType.Array,
        length: 2,
        value: [
          {
            type: ValueType.Array,
            length: 1,
            value: [
              {
                type: ValueType.Object,
                length: 1,
                value: { c: { type: ValueType.Number, value: 2 } },
                setValue: expect.any(Function),
              },
            ],
            setValue: expect.any(Function),
          },
          {
            type: ValueType.Object,
            length: 1,
            value: {
              two: {
                type: ValueType.Object,
                length: 1,
                value: { c: { type: ValueType.Number, value: 2 } },
                setValue: expect.any(Function),
              },
            },
            setValue: expect.any(Function),
          },
        ],
        setValue: expect.any(Function),
      },
    ],
    [
      'Circular reference',
      [
        [ValueType.Object, { a: 1, b: 0 }],
        [ValueType.Number, 1],
      ],
      (s: any) => {
        const topObject: DecodedValue<ValueType.Object> = {
          type: ValueType.Object,
          setValue: s.setValue,
          length: 2,
          value: { a: { type: ValueType.Number, value: 1 } },
        }

        // @ts-ignore
        topObject.value.b = topObject

        return topObject
      },
    ],
    [
      'Circular reference in array',
      [
        [ValueType.Array, [1]],
        [ValueType.Object, { a: 2, b: 1 }],
        [ValueType.Number, 1],
      ],
      (s: any) => {
        const topArray: DecodedValue<ValueType.Array> = {
          type: ValueType.Array,
          setValue: s.setValue,
          length: 1,
          value: [
            {
              type: ValueType.Object,
              setValue: s.value[0].setValue,
              length: 2,
              value: { a: { type: ValueType.Number, value: 1 } },
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
    test(testName, () => {
      const s = decodeValue(value, null, new StoreNodeMap())
      expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
    })
  }
})

describe('finding stores in values', () => {
  const storeExpectations: Expectations = [
    [
      'Store',
      [
        [ValueType.Store, '#5:1'],
        [ValueType.Object, { a: 2 }],
        [ValueType.Number, 1],
      ],
      {
        type: ValueType.Store,
        id: '#5',
        valueType: ValueType.Object,
        length: 1,
        value: { a: { type: ValueType.Number, value: 1 } },
        setValue: expect.any(Function),
      },
    ],
    [
      'Store in array',
      [
        [ValueType.Array, [1]],
        [ValueType.Store, '#5:2'],
        [ValueType.Object, { a: 3 }],
        [ValueType.Number, 1],
      ],
      {
        type: ValueType.Array,
        length: 1,
        value: [
          {
            type: ValueType.Store,
            id: '#5',
            valueType: ValueType.Object,
            length: 1,
            value: { a: { type: ValueType.Number, value: 1 } },
            setValue: expect.any(Function),
          },
        ],
        setValue: expect.any(Function),
      },
    ],
    [
      'referenced store',
      [
        [ValueType.Object, { state2: 1 }],
        [ValueType.Store, '#6:2'],
        [ValueType.Object, { ref: 3 }],
        [ValueType.Store, '#5:4'],
        [ValueType.Object, { a: 5 }],
        [ValueType.Number, 1],
      ],
      {
        type: ValueType.Object,
        length: 1,
        value: {
          state2: {
            type: ValueType.Store,
            id: '#6',
            valueType: ValueType.Object,
            length: 1,
            value: {
              ref: {
                type: ValueType.Store,
                id: '#5',
                valueType: ValueType.Object,
                length: 1,
                value: expect.any(Object),
                setValue: expect.any(Function),
              },
            },
            setValue: expect.any(Function),
          },
        },
        setValue: expect.any(Function),
      },
    ],
    [
      'nested store',
      [
        [ValueType.Store, '#7:1'],
        [ValueType.Object, { a: 2, b: 3 }],
        [ValueType.Number, 1],
        [ValueType.Store, '#8:4'],
        [ValueType.Array, [5]],
        [ValueType.String, 'foo'],
      ],
      {
        type: ValueType.Store,
        id: '#7',
        valueType: ValueType.Object,
        length: 2,
        value: {
          a: { type: ValueType.Number, value: 1 },
          b: {
            type: ValueType.Store,
            id: '#8',
            valueType: ValueType.Array,
            length: 1,
            value: [{ type: ValueType.String, value: 'foo' }],
            setValue: expect.any(Function),
          },
        },
        setValue: expect.any(Function),
      },
    ],
    [
      'circular store',
      [
        [ValueType.Store, '#9:1'],
        [ValueType.Object, { a: 2, b: 0 }],
        [ValueType.Number, 1],
      ],
      (s: any) => {
        const topObject: DecodedValue<ValueType.Store> = {
          type: ValueType.Store,
          id: '#9',
          valueType: ValueType.Object,
          length: 2,
          value: { a: { type: ValueType.Number, value: 1 } },
          setValue: s.setValue,
        }

        // @ts-ignore
        topObject.value.b = topObject

        return topObject
      },
    ],
  ]

  for (const [testName, value, expectation] of storeExpectations) {
    test(testName, () => {
      const s = decodeValue(value, null, new StoreNodeMap())
      expect(s).toEqual(typeof expectation === 'function' ? expectation(s) : expectation)
    })
  }
})
