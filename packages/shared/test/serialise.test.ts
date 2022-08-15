import {
  encodePreview,
  ValueType,
  INFINITY,
  NEGATIVE_INFINITY,
  NAN,
  EncodedPreview,
} from "../src/serialize"

const _testFunction = () => {}

const encodePreviewExpectations: [string, unknown, EncodedPreview][] = [
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
  ["Array", [], { type: ValueType.Array, value: 0 }],
  ["Array", [1, 2, 3], { type: ValueType.Array, value: 3 }],
  ["Object", {}, { type: ValueType.Object }],
  ["Object", { a: 1, b: 2, c: 3 }, { type: ValueType.Object }],
  ["Date", new Date(), { type: ValueType.Instance, value: "Date" }],
  ["Error", new Error(), { type: ValueType.Instance, value: "Error" }],
  ["Map", new Map(), { type: ValueType.Instance, value: "Map" }],
  ["WeakMap", new WeakMap(), { type: ValueType.Instance, value: "WeakMap" }],
  ["Set", new Set(), { type: ValueType.Instance, value: "Set" }],
]

describe("encodePreview", () => {
  for (const [testName, value, expectation] of encodePreviewExpectations) {
    test(testName, () => {
      const s = encodePreview(value)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})
