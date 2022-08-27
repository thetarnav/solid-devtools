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
  [ValueType.Object]: number
  [ValueType.Number]: number | typeof INFINITY | typeof NEGATIVE_INFINITY | typeof NAN
  [ValueType.Boolean]: boolean
  [ValueType.String]: string
  [ValueType.Symbol]: string
  [ValueType.Function]: string
  [ValueType.Element]: { name: string; id?: number }
  [ValueType.Instance]: string
}

export type EncodedValueOf<K extends ValueType, Deep extends boolean = false> = {
  type: K
} & (K extends keyof EncodedPreviewPayloadMap
  ? { value: EncodedPreviewPayloadMap[K] }
  : { value?: undefined }) &
  (Deep extends true
    ? K extends ValueType.Object
      ? { children: Record<string, EncodedValue<true>> }
      : K extends ValueType.Array
      ? { children: EncodedValue<true>[] }
      : { children?: undefined }
    : { children?: undefined })

export type EncodedValue<Deep extends boolean = false> = {
  [K in ValueType]: EncodedValueOf<K, Deep>
}[ValueType]

let lastId = 0

export function encodeValue<Deep extends boolean>(
  value: unknown,
  deep: Deep,
  elementMap?: Record<number, HTMLElement>,
): EncodedValue<Deep> {
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
  if (value instanceof HTMLElement) {
    if (elementMap) {
      const id = lastId++
      elementMap[id] = value
      return { type: ValueType.Element, value: { name: value.tagName, id } }
    }
    return { type: ValueType.Element, value: { name: value.tagName } }
  }

  if (Array.isArray(value)) {
    const payload = { type: ValueType.Array, value: value.length } as EncodedValueOf<
      ValueType.Array,
      boolean
    >
    if (deep) payload.children = value.map(item => encodeValue(item, true, elementMap))
    return payload
  }

  const s = Object.prototype.toString.call(value)
  const name = s.slice(8, -1)
  if (name === "Object") {
    const obj = value as Record<PropertyKey, unknown>
    const payload = { type: ValueType.Object, value: Object.keys(obj).length } as EncodedValueOf<
      ValueType.Object,
      boolean
    >
    if (deep)
      payload.children = Object.keys(obj).reduce<Record<string, EncodedValue<true>>>((acc, key) => {
        acc[key] = encodeValue(obj[key], true, elementMap)
        return acc
      }, {})
    return payload
  }

  return { type: ValueType.Instance, value: name }
}
