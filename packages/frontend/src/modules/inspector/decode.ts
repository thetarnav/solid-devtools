import {
  EncodedValue,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  NodeID,
  UNDEFINED,
  ValueType,
} from '@solid-devtools/debugger/types'
import { splitOnColon } from '@solid-devtools/shared/utils'
import { batch, createSignal } from 'solid-js'

export class StoreNodeMap {
  map = new Map<NodeID, { node: DecodedValue<ValueType.Store>; refs: number }>()
  get(id: NodeID): DecodedValue<ValueType.Store> | null {
    return this.map.get(id)?.node || null
  }
  addRef(id: NodeID, node: DecodedValue<ValueType.Store>) {
    const entry = this.map.get(id)
    if (entry) entry.refs++
    else this.map.set(id, { node, refs: 1 })
  }
  removeRef(id: NodeID) {
    const entry = this.map.get(id)
    if (entry) {
      entry.refs--
      if (entry.refs === 0) {
        this.map.delete(id)
      }
    }
  }
  clear() {
    this.map.clear()
  }
}

export type ObjectValueData = {
  value: Record<string, DecodedValue> | null
  length: number
  setValue: (newValue: number | Record<string, DecodedValue> | DecodedValue[]) => void
}

export type DecodedDataMap = {
  [ValueType.String]: { value: string }
  [ValueType.Number]: { value: number }
  [ValueType.Boolean]: { value: boolean }
  [ValueType.Null]: { value: null | undefined }
  [ValueType.Symbol]: { name: string }
  [ValueType.Instance]: { name: string }
  [ValueType.Function]: { name: string }
  [ValueType.Element]: { name: string; id: NodeID }
  [ValueType.Getter]: { name: string }
  [ValueType.Array]: ObjectValueData
  [ValueType.Object]: ObjectValueData
  [ValueType.Store]: ObjectValueData & {
    id: NodeID
    valueType: ValueType.Array | ValueType.Object
  }
  [ValueType.Unknown]: {}
}
export type DecodedValueMap = {
  [K in ValueType]: DecodedDataMap[K] & { type: K }
}

export type DecodedValue<T extends ValueType = ValueType> = DecodedValueMap[T]

let List: EncodedValue[]
let DecodedMap: Map<number, DecodedValue>
let StoreRefMap: StoreNodeMap

const saveToMap = <T extends DecodedValue>(index: number, value: T): T => {
  DecodedMap.set(index, value)
  return value
}

function decode(index: number): DecodedValue {
  if (DecodedMap.has(index)) {
    return DecodedMap.get(index)!
  }

  const encoded = List[index]
  switch (encoded[0]) {
    case ValueType.String:
    case ValueType.Boolean:
      return { type: encoded[0], value: encoded[1] as any }
    case ValueType.Null:
      return { type: ValueType.Null, value: encoded[1] === UNDEFINED ? undefined : null }
    case ValueType.Number: {
      const [, data] = encoded
      const value =
        data === INFINITY
          ? Infinity
          : data === NEGATIVE_INFINITY
          ? -Infinity
          : data === NAN
          ? NaN
          : data
      return { type: ValueType.Number, value }
    }
    case ValueType.Symbol:
      return { type: ValueType.Symbol, name: encoded[1] }
    case ValueType.Instance:
    case ValueType.Function:
    case ValueType.Getter:
      return saveToMap(index, { type: encoded[0], name: encoded[1] })
    case ValueType.Element: {
      const [id, name] = splitOnColon(encoded[1])
      return saveToMap(index, { type: ValueType.Element, id, name })
    }
    case ValueType.Array:
    case ValueType.Object: {
      const [type, data] = encoded

      const [length, setLength] = createSignal(
        typeof data === 'number'
          ? data
          : Array.isArray(data)
          ? data.length
          : Object.keys(data).length,
      )
      const initValue: ObjectValueData['value'] =
        typeof data === 'number' ? null : data.constructor()
      const [value, setActualValue] = createSignal<ObjectValueData['value']>(initValue)

      const valueObject: ObjectValueData = saveToMap(index, {
        type,
        get value() {
          return value()
        },
        get length() {
          return length()
        },
        setValue(newValue) {
          batch(() => {
            if (typeof newValue === 'number') {
              setLength(newValue)
              setActualValue(null)
            } else {
              setLength(Array.isArray(newValue) ? newValue.length : Object.keys(newValue).length)
              setActualValue(newValue as any)
            }
          })
        },
      })

      if (initValue) {
        for (const [key, child] of Object.entries(data)) {
          initValue[key] = child === -1 ? { type: ValueType.Getter, name: key } : decode(child)
        }
      }

      return valueObject as DecodedValue
    }
    case ValueType.Store: {
      const [id, vIndex] = splitOnColon(encoded[1])
      let store = StoreRefMap.get(id)
      if (!store) {
        store = saveToMap(index, { id } as DecodedValue<ValueType.Store>)
        const value = decode(+vIndex) as DecodedValue<ValueType.Object | ValueType.Array>
        store.valueType = value.type
        store.setValue = value.setValue
        Object.defineProperties(store, {
          value: { get: () => value.value },
          length: { get: () => value.length },
        })
      }
      StoreRefMap.addRef(id, store)
      return store
    }
    case ValueType.Unknown:
      return { type: ValueType.Unknown }
  }
}

/** to avoid circular references in `removeNestedStoreRefs` */
let Seen = new Set<DecodedValue>()

export const isValueNested = (
  value: DecodedValue,
): value is DecodedValue<ValueType.Array | ValueType.Object | ValueType.Store> & {
  value: NonNullable<ObjectValueData['value']>
} =>
  (value.type === ValueType.Array ||
    value.type === ValueType.Object ||
    value.type === ValueType.Store) &&
  !!value.value &&
  value.length > 0

export function removeNestedStoreRefs(value: DecodedValue) {
  if (Seen.has(value)) return
  Seen.add(value)
  if (isValueNested(value)) Object.values(value.value).forEach(removeNestedStoreRefs)
}

export function decodeValue(
  list: EncodedValue[],
  prevValue: DecodedValue | null,
  storeRefMap: StoreNodeMap,
): DecodedValue {
  StoreRefMap = storeRefMap

  Seen = new Set()
  prevValue && removeNestedStoreRefs(prevValue)
  Seen = undefined as any

  List = list
  DecodedMap = new Map()
  const decoded = decode(0)
  // @ts-expect-error - we don't want to keep globals around
  List = DecodedMap = StoreRefMap = undefined

  return decoded
}
