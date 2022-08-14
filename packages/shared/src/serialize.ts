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

export type SerializedPreview =
  | { type: ValueType.Array; length: number }
  | { type: ValueType.Object }
  | {
      type: ValueType.Number
      value: number | typeof INFINITY | typeof NEGATIVE_INFINITY | typeof NAN
    }
  | { type: ValueType.Boolean; value: boolean }
  | { type: ValueType.String; value: string }
  | { type: ValueType.Null }
  | { type: ValueType.Undefined }
  | { type: ValueType.Symbol; name: string }
  | { type: ValueType.Function; name: string }
  | { type: ValueType.Element; name: string }
  | { type: ValueType.Instance; name: string }

export function serializePreview(value: unknown): SerializedPreview {
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
  if (typeof value === "symbol") return { type: ValueType.Symbol, name: value.description ?? "" }
  if (typeof value === "function") return { type: ValueType.Function, name: value.name }
  if (value instanceof HTMLElement) return { type: ValueType.Element, name: value.tagName }
  if (Array.isArray(value)) return { type: ValueType.Array, length: value.length }

  const s = Object.prototype.toString.call(value)
  const name = s.slice(8, -1)
  if (name === "Object") return { type: ValueType.Object }
  return { type: ValueType.Instance, name }
}
