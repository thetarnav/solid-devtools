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

type PreviewPayloadOf<K extends ValueType> = K extends keyof EncodedPreviewPayloadMap
  ? { value: EncodedPreviewPayloadMap[K] }
  : { value?: undefined }

export type EncodedValueOf<K extends ValueType, Deep extends boolean = false> = {
  type: K
} & (Deep extends true
  ? K extends ValueType.Array
    ? { value: EncodedValue<true>[] }
    : K extends ValueType.Object
    ? { value: Record<string, EncodedValue<true>> }
    : PreviewPayloadOf<K>
  : PreviewPayloadOf<K>)

export type EncodedValue<Deep extends boolean = false> = {
  [K in ValueType]: EncodedValueOf<K, Deep>
}[ValueType]

export function encodeValue<Deep extends boolean>(value: unknown, deep: Deep): EncodedValue<Deep>
export function encodeValue(value: unknown): EncodedValue<false>
export function encodeValue<Deep extends boolean>(value: unknown, deep?: Deep): EncodedValue<Deep> {
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

  if (Array.isArray(value))
    return {
      type: ValueType.Array,
      value: deep ? value.map(item => encodeValue(item, true)) : value.length,
    }

  const s = Object.prototype.toString.call(value)
  const name = s.slice(8, -1)
  if (name === "Object") {
    const obj = value as Record<PropertyKey, unknown>
    const type = ValueType.Object
    return !deep
      ? { type }
      : {
          type,
          value: Object.keys(obj).reduce((acc, key) => {
            acc[key] = encodeValue(obj[key], true)
            return acc
          }, {} as Record<string, EncodedValue<true>>),
        }
  }

  return { type: ValueType.Instance, value: name }
}
