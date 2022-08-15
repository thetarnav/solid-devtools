import { JsonValue } from "type-fest"

export const INFINITY = "__$sdt-Infinity__"
export const NEGATIVE_INFINITY = "__$sdt-NegativeInfinity__"
export const NAN = "__$sdt-NaN__"

export enum ValueType {
  Number,
  Boolean,
  String,
  Null,
  Undefined,
  Symbol,
  Array,
  Object,
  Function,
  Element,
  Instance,
}

export type EncodedPreviewPayloadMap = {
  [ValueType.Array]: number
  [ValueType.Number]: number | typeof INFINITY | typeof NEGATIVE_INFINITY | typeof NAN
  [ValueType.Boolean]: boolean
  [ValueType.String]: string
  [ValueType.Symbol]: string
  [ValueType.Function]: string
  [ValueType.Element]: string
  [ValueType.Instance]: string
}

export type EncodedPreview = {
  [K in ValueType]: { type: K } & (K extends keyof EncodedPreviewPayloadMap
    ? { value: EncodedPreviewPayloadMap[K] }
    : {})
}[ValueType]

export function encodePreview(value: unknown): EncodedPreview {
  if (typeof value === "number") {
    if (value === Infinity) return { type: ValueType.Number, value: INFINITY }
    if (value === -Infinity) return { type: ValueType.Number, value: NEGATIVE_INFINITY }
    if (Number.isNaN(value)) return { type: ValueType.Number, value: NAN }
    return { type: ValueType.Number, value }
  }
  if (typeof value === "boolean") return { type: ValueType.Boolean, value }
  if (typeof value === "string") return { type: ValueType.String, value }
  if (value === null) return { type: ValueType.Null }
  if (value === undefined) return { type: ValueType.Undefined }
  if (typeof value === "symbol") return { type: ValueType.Symbol, value: value.description ?? "" }
  if (typeof value === "function") return { type: ValueType.Function, value: value.name }
  if (value instanceof HTMLElement) return { type: ValueType.Element, value: value.tagName }
  if (Array.isArray(value)) return { type: ValueType.Array, value: value.length }

  const s = Object.prototype.toString.call(value)
  const name = s.slice(8, -1)
  if (name === "Object") return { type: ValueType.Object }
  return { type: ValueType.Instance, value: name }
}

const literalTypes = ["bigint", "number", "boolean", "string", "undefined"]

/** @deprecated */
export function getSafeValue(value: unknown): JsonValue {
  if (literalTypes.includes(typeof value)) return value as JsonValue
  return value + ""
}
