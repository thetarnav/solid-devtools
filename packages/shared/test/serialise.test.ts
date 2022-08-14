import {
  serializePreview,
  ValueType,
  INFINITY,
  NEGATIVE_INFINITY,
  NAN,
  SerializedPreview,
} from "../src/serialize"

const _testFunction = () => {}

const serializePreviewExpectations: [string, unknown, SerializedPreview][] = [
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
  ["Named Symbol", Symbol("foo"), { type: ValueType.Symbol, name: "foo" }],
  ["Symbol", Symbol(), { type: ValueType.Symbol, name: "" }],
  ["Function", () => {}, { type: ValueType.Function, name: "" }],
  ["Named Function", _testFunction, { type: ValueType.Function, name: "_testFunction" }],
  ["Element div", document.createElement("div"), { type: ValueType.Element, name: "DIV" }],
  ["Element a", document.createElement("a"), { type: ValueType.Element, name: "A" }],
  ["Array", [], { type: ValueType.Array, length: 0 }],
  ["Array", [1, 2, 3], { type: ValueType.Array, length: 3 }],
  ["Object", {}, { type: ValueType.Object }],
  ["Object", { a: 1, b: 2, c: 3 }, { type: ValueType.Object }],
  ["Date", new Date(), { type: ValueType.Instance, name: "Date" }],
  ["Error", new Error(), { type: ValueType.Instance, name: "Error" }],
  ["Map", new Map(), { type: ValueType.Instance, name: "Map" }],
  ["WeakMap", new WeakMap(), { type: ValueType.Instance, name: "WeakMap" }],
  ["Set", new Set(), { type: ValueType.Instance, name: "Set" }],
]

describe("serializePreview", () => {
  for (const [testName, value, expectation] of serializePreviewExpectations) {
    test(testName, () => {
      const s = serializePreview(value)
      expect(s).toEqual(expectation)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    })
  }
})
