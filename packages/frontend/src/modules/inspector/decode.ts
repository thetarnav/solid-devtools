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
import { Writable } from 'type-fest'

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
  readonly value: Readonly<Record<string | number, DecodedValue>> | null
  readonly length: number
  readonly setValue: (newValue: number | Readonly<Record<string | number, DecodedValue>>) => void
}

type DecodedDataMap = {
  [ValueType.String]: { readonly value: string }
  [ValueType.Number]: { readonly value: number }
  [ValueType.Boolean]: { readonly value: boolean }
  [ValueType.Null]: { readonly value: null | undefined }
  [ValueType.Symbol]: { readonly name: string }
  [ValueType.Instance]: { readonly name: string }
  [ValueType.Function]: { readonly name: string }
  [ValueType.Element]: { readonly name: string; readonly id: NodeID }
  [ValueType.Getter]: { readonly name: string }
  [ValueType.Array]: ObjectValueData
  [ValueType.Object]: ObjectValueData
  [ValueType.Store]: ObjectValueData & {
    readonly id: NodeID
    readonly valueType: ValueType.Array | ValueType.Object
  }
  [ValueType.Unknown]: {}
}
type DecodedValueMap = {
  [K in ValueType]: DecodedDataMap[K] & { readonly type: K }
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
      const initValue: Writable<ObjectValueData['value']> =
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
        store = saveToMap(index, { id, type: ValueType.Store } as DecodedValue<ValueType.Store>)
        const value = decode(+vIndex) as DecodedValue<ValueType.Object | ValueType.Array>
        const desc = Object.getOwnPropertyDescriptors(value)
        Object.defineProperties(store, {
          valueType: desc.type,
          setValue: desc.setValue,
          value: desc.value,
          length: desc.length,
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

/**
 * Check if a value is an object type (array, object, or store).
 */
export const isObjectType = (
  value: DecodedValue,
): value is DecodedValue<ValueType.Array | ValueType.Object | ValueType.Store> => {
  const { type } = value
  return type === ValueType.Array || type === ValueType.Object || type === ValueType.Store
}

/**
 * Check if a value is an object type (array, object, or store).
 * And that it has children. (isn't empty)
 */
export const isValueNested = (
  value: DecodedValue,
): value is DecodedValue<ValueType.Array | ValueType.Object | ValueType.Store> =>
  isObjectType(value) && value.length > 0

function removeNestedStoreRefs(value: DecodedValue) {
  if (Seen.has(value)) return
  Seen.add(value)
  value.type === ValueType.Store && StoreRefMap.removeRef(value.id)
  isValueNested(value) && value.value && Object.values(value.value).forEach(removeNestedStoreRefs)
}

/**
 * Decode a list of encoded values into a tree of decoded values.
 * The previous value is important for removing store references that are no longer in the tree.
 */
export function decodeValue(
  list: EncodedValue[],
  prevValue: DecodedValue | null,
  storeRefMap: StoreNodeMap,
): DecodedValue {
  StoreRefMap = storeRefMap
  Seen = new Set()
  List = list
  DecodedMap = new Map()

  prevValue && removeNestedStoreRefs(prevValue)

  const decoded = decode(0)

  // we don't want to keep globals around
  List = DecodedMap = StoreRefMap = Seen = undefined!

  return decoded
}

/**
 * Collapse or extend the value of an object/array/store.
 * The previous value is important for removing store references that are no longer in the tree.
 */
export function updateCollapsedValue(
  data: DecodedValue<ValueType.Object | ValueType.Array | ValueType.Store>,
  list: EncodedValue[],
  storeRefMap: StoreNodeMap,
): void {
  if (data.type !== list[0][0]) throw new Error('Type mismatch')

  List = list
  StoreRefMap = storeRefMap
  Seen = new Set()
  DecodedMap = new Map()

  // the relevant value for the store is the second item in the list
  const head = (
    list[data.type === ValueType.Store ? 1 : 0] as EncodedValue<ValueType.Object | ValueType.Array>
  )[1]

  // collapse object value
  if (data.value && typeof head === 'number') {
    Object.values(data.value).forEach(removeNestedStoreRefs)
    data.setValue(head)
  }
  // expand object value
  else if (!data.value && typeof head !== 'number') {
    const newValue: Record<string | number, DecodedValue> = head.constructor()
    for (const [key, index] of Object.entries(head)) {
      newValue[key] = index === -1 ? { type: ValueType.Getter, name: key } : decode(index)
    }
    data.setValue(newValue)
  }

  StoreRefMap = List = Seen = DecodedMap = undefined!
}
