import {
  ValueType,
  INFINITY,
  NEGATIVE_INFINITY,
  NAN,
  encodeValue,
  EncodedValue,
} from "../src/serialize"

const _testFunction = () => {}

const encodePreviewExpectations: [string, unknown, EncodedValue<false>][] = [
  ["Infinity", Infinity, { type: ValueType.Number, value: INFINITY }],
  ["Negative Infinity", -Infinity, { type: ValueType.Number, value: NEGATIVE_INFINITY }],
  ["NaN", NaN, { type: ValueType.Number, value: NAN }],
  ["Number", 1, { type: ValueType.Number, value: 1 }],
  ["Boolean true", true, { type: ValueType.Boolean, value: true }],
  ["Boolean false", false, { type: ValueType.Boolean, value: false }],
  ["String", "", { type: ValueType.String, value: "" }],
  ["String", "foo", { type: ValueType.String, value: "foo" }],
  ["Null", null, { type: ValueType.Null }],
  ["Undefined", undefined, { type: ValueType.Undefined }],
  ["Named Symbol", Symbol("foo"), { type: ValueType.Symbol, value: "foo" }],
  ["Symbol", Symbol(), { type: ValueType.Symbol, value: "" }],
  ["Function", () => {}, { type: ValueType.Function, value: "" }],
  ["Named Function", _testFunction, { type: ValueType.Function, value: "_testFunction" }],
  ["Element div", document.createElement("div"), { type: ValueType.Element, value: "DIV" }],
  ["Element a", document.createElement("a"), { type: ValueType.Element, value: "A" }],
  ["Array empty", [], { type: ValueType.Array, value: 0 }],
  ["Array", [1, 2, 3], { type: ValueType.Array, value: 3 }],
  ["Object empty", {}, { type: ValueType.Object }],
  ["Object", { a: 1, b: 2, c: 3 }, { type: ValueType.Object }],
  ["Date", new Date(), { type: ValueType.Instance, value: "Date" }],
  ["Error", new Error(), { type: ValueType.Instance, value: "Error" }],
  ["Map", new Map(), { type: ValueType.Instance, value: "Map" }],
  ["WeakMap", new WeakMap(), { type: ValueType.Instance, value: "WeakMap" }],
  ["Set", new Set(), { type: ValueType.Instance, value: "Set" }],
]

describe("encodeValue Preview", () => {
  for (const [testName, value, expectation] of encodePreviewExpectations) {
    test(testName, () => {
      const s = encodeValue(value)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})

const encodeDeepExpectations: [string, unknown, EncodedValue<true>][] = [
  ["Array empty", [], { type: ValueType.Array, value: [] }],
  [
    "Array shallow",
    [1, 2, 3],
    {
      type: ValueType.Array,
      value: [
        { type: ValueType.Number, value: 1 },
        { type: ValueType.Number, value: 2 },
        { type: ValueType.Number, value: 3 },
      ],
    },
  ],
  [
    "Array nested",
    [[1, { foo: "bar" }], 2, { map: new Map() }],
    {
      type: ValueType.Array,
      value: [
        {
          type: ValueType.Array,
          value: [
            { type: ValueType.Number, value: 1 },
            { type: ValueType.Object, value: { foo: { type: ValueType.String, value: "bar" } } },
          ],
        },
        { type: ValueType.Number, value: 2 },
        { type: ValueType.Object, value: { map: { type: ValueType.Instance, value: "Map" } } },
      ],
    },
  ],
  ["Object empty", {}, { type: ValueType.Object, value: {} }],
  [
    "Object shallow",
    { a: 1, b: 2, c: 3 },
    {
      type: ValueType.Object,
      value: {
        a: { type: ValueType.Number, value: 1 },
        b: { type: ValueType.Number, value: 2 },
        c: { type: ValueType.Number, value: 3 },
      },
    },
  ],
  [
    "Object nested",
    { a: [1, { foo: "bar" }], b: 2, c: { map: new Map() } },
    {
      type: ValueType.Object,
      value: {
        a: {
          type: ValueType.Array,
          value: [
            { type: ValueType.Number, value: 1 },
            { type: ValueType.Object, value: { foo: { type: ValueType.String, value: "bar" } } },
          ],
        },
        b: { type: ValueType.Number, value: 2 },
        c: { type: ValueType.Object, value: { map: { type: ValueType.Instance, value: "Map" } } },
      },
    },
  ],
]

describe("encodeValue Deep", () => {
  for (const [testName, value, expectation] of encodeDeepExpectations) {
    test(testName, () => {
      const s = encodeValue(value, true)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})
