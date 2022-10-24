import {
  EncodedValue,
  EncodedValueOf,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  ValueType,
} from '@solid-devtools/shared/graph'

export function encodeValue<Deep extends boolean>(
  value: unknown,
  deep: Deep,
  elementMap?: ElementMap,
): EncodedValue<Deep> {
  if (typeof value === 'number') {
    if (value === Infinity) return { type: ValueType.Number, value: INFINITY }
    if (value === -Infinity) return { type: ValueType.Number, value: NEGATIVE_INFINITY }
    if (Number.isNaN(value)) return { type: ValueType.Number, value: NAN }
    return { type: ValueType.Number, value }
  }
  if (typeof value === 'boolean') return { type: ValueType.Boolean, value }
  if (typeof value === 'string') return { type: ValueType.String, value }
  if (value === null) return { type: ValueType.Null }
  if (value === undefined) return { type: ValueType.Undefined }
  if (typeof value === 'symbol') return { type: ValueType.Symbol, value: value.description ?? '' }
  if (typeof value === 'function') return { type: ValueType.Function, value: value.name }

  if (value instanceof HTMLElement)
    return {
      type: ValueType.Element,
      value: elementMap
        ? { name: value.tagName, id: elementMap.set(value) }
        : { name: value.tagName },
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
  if (name === 'Object') {
    const obj = value as Record<PropertyKey, unknown>
    const payload: EncodedValueOf<ValueType.Object, boolean> = {
      type: ValueType.Object,
      value: Object.keys(obj).length,
    }
    if (deep) {
      const children: Record<string, EncodedValue<true>> = (payload.children = {} as any)
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        children[key] = descriptor.get
          ? { type: ValueType.Getter, value: key }
          : encodeValue(descriptor.value, true, elementMap)
      }
    }
    return payload
  }

  return { type: ValueType.Instance, value: name }
}

let lastId = 0

export class ElementMap {
  private obj: Record<string, HTMLElement> = {}
  private map: WeakMap<HTMLElement, string> = new WeakMap()

  get(id: string): HTMLElement | undefined {
    return this.obj[id]
  }

  set(element: HTMLElement): string {
    let id = this.map.get(element)
    if (id !== undefined) return id
    id = (lastId++).toString()
    this.obj[id] = element
    this.map.set(element, id)
    return id
  }
}