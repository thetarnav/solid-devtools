export const INFINITY = "__$sdt-Infinity__"
export const NEGATIVE_INFINITY = "__$sdt-NegativeInfinity__"

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
}

export type SerializedPreview =
  | { type: ValueType.Array; length: number }
  | { type: ValueType.Object }
  | { type: ValueType.Number; value: number | typeof INFINITY | typeof NEGATIVE_INFINITY }
  | { type: ValueType.Boolean; value: boolean }
  | { type: ValueType.String; value: string }
  | { type: ValueType.Null }
  | { type: ValueType.Undefined }
  | { type: ValueType.Symbol; name: string }
  | { type: ValueType.Function; name: string }
  | { type: ValueType.Element; name: string }

export function serializePreview(value: unknown): SerializedPreview {
  return 0 as any
}
