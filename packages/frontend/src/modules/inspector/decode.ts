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
import { createSignal, Setter } from 'solid-js'

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
  [ValueType.Array]: {
    value: number | DecodedValue[]
    setValue: Setter<number | DecodedValue[]>
  }
  [ValueType.Object]: {
    value: number | Record<string, DecodedValue>
    setValue: Setter<number | Record<string, DecodedValue>>
  }
  [ValueType.Store]: {
    id: NodeID
    objectType: ValueType.Array | ValueType.Object
    value: number | Record<string | number, DecodedValue> | DecodedValue[]
    setValue: Setter<number | Record<string | number, DecodedValue> | DecodedValue[]>
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

      const [value, setValue] = createSignal<
        DecodedValue[] | { [key: string]: DecodedValue } | number
      >(typeof data === 'number' ? data : -1)

      const valueObject: DecodedValue<ValueType.Array | ValueType.Object> = saveToMap(index, {
        type,
        get value() {
          return value()
        },
        setValue,
      } as DecodedValue<ValueType.Array | ValueType.Object>)

      if (typeof data !== 'number') {
        const initValue: Record<string, DecodedValue> = saveToMap(index, data.constructor())
        for (const [key, child] of Object.entries(data)) {
          initValue[key] = child === -1 ? { type: ValueType.Getter, name: key } : decode(child)
        }
        setValue(initValue)
      }

      return valueObject
    }
    case ValueType.Store: {
      const [id, vIndex] = splitOnColon(encoded[1])
      let store = StoreRefMap.get(id)
      if (!store) {
        store = saveToMap(index, { id } as DecodedValue<ValueType.Store>)
        const value = decode(+vIndex) as DecodedValue<ValueType.Object | ValueType.Array>
        store.objectType = value.type
        store.setValue = value.setValue
        Object.defineProperty(store, 'value', { get: () => value.value })
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

export function removeNestedStoreRefs(value: DecodedValue) {
  if (
    Seen.has(value) ||
    (value.type !== ValueType.Array &&
      value.type !== ValueType.Object &&
      value.type !== ValueType.Store) ||
    typeof value.value === 'number'
  ) {
    return
  }
  Seen.add(value)
  Object.values(value.value).forEach(removeNestedStoreRefs)
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
