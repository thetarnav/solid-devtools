import { createStore, SetStoreFunction } from 'solid-js/store'
import { splitOnColon } from '@solid-devtools/shared/utils'
import {
  EncodedValue,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  NodeID,
  UNDEFINED,
  ValueType,
} from '@solid-devtools/debugger/types'

export class StoreNodeMap {
  map = new Map<NodeID, { node: StoreNode; refs: number }>()
  get(id: NodeID): StoreNode | null {
    return this.map.get(id)?.node || null
  }
  addRef(id: NodeID, node: StoreNode) {
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

// TODO: don't use classes, use plain objects

export class StoreNode {
  #state: { readonly value: DecodedValue }
  get value() {
    return this.#state.value
  }
  setState: SetStoreFunction<DecodedValue>
  constructor(public id: NodeID) {
    const [state, setState] = createStore<{ readonly value: DecodedValue }>({ value: null })
    this.#state = state
    this.setState = (...a: any[]) => setState('value', ...(a as [any]))
  }
}
export class InstanceNode {
  constructor(public name: string) {}
}
export class FunctionNode {
  constructor(public name: string) {}
}
export class ElementNode {
  constructor(public id: NodeID, public name: string) {}
}
export class GetterNode {
  constructor(public name: string) {}
}
export class ObjectPreviewNode {
  constructor(public type: ValueType.Object | ValueType.Array, public length: number) {}
}

export type DecodedValueMap = {
  [ValueType.String]: string
  [ValueType.Number]: number
  [ValueType.Boolean]: boolean
  [ValueType.Null]: null | undefined
  [ValueType.Symbol]: symbol
  [ValueType.Instance]: InstanceNode
  [ValueType.Function]: FunctionNode
  [ValueType.Element]: ElementNode
  [ValueType.Getter]: GetterNode
  [ValueType.Array]: ArrayDecodedValue | ObjectPreviewNode
  [ValueType.Object]: ObjectDecodedValue | ObjectPreviewNode
  [ValueType.Store]: StoreNode
}
// used interface instead of type to avoid circular dependency
interface ArrayDecodedValue extends Array<DecodedValue> {}
interface ObjectDecodedValue extends Record<string, DecodedValue> {}

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
    return DecodedMap.get(index)
  }

  const encoded = List[index]
  switch (encoded[0]) {
    case ValueType.String:
    case ValueType.Boolean:
      return encoded[1]
    case ValueType.Null:
      return encoded[1] === UNDEFINED ? undefined : null
    case ValueType.Number: {
      const [, data] = encoded
      return data === INFINITY
        ? Infinity
        : data === NEGATIVE_INFINITY
        ? -Infinity
        : data === NAN
        ? NaN
        : data
    }
    case ValueType.Symbol:
      return Symbol(encoded[1])
    case ValueType.Instance:
      return saveToMap(index, new InstanceNode(encoded[1]))
    case ValueType.Function:
      return saveToMap(index, new FunctionNode(encoded[1]))
    case ValueType.Element: {
      const [id, name] = splitOnColon(encoded[1])
      return saveToMap(index, new ElementNode(id, name))
    }
    case ValueType.Getter:
      return saveToMap(index, new GetterNode(encoded[1]))
    case ValueType.Array:
    case ValueType.Object: {
      const [type, data] = encoded
      if (typeof data === 'number') {
        return saveToMap(index, new ObjectPreviewNode(type, data))
      }
      const value = saveToMap(index, data.constructor() as ArrayDecodedValue | ObjectDecodedValue)
      for (const [key, index] of Object.entries(data)) {
        ;(value as Record<string, DecodedValue>)[key] =
          index === -1 ? new GetterNode(key) : decode(index)
      }
      return value
    }
    case ValueType.Store: {
      const [id, vIndex] = splitOnColon(encoded[1])
      let store = StoreRefMap.get(id)
      if (!store) {
        store = saveToMap(index, new StoreNode(id))
        store.setState(decode(+vIndex))
      }
      StoreRefMap.addRef(id, store)
      return store
    }
  }
}

/** to avoid circular references in `removeNestedStoreRefs` */
let Seen = new Set<DecodedValue>()

export function removeNestedStoreRefs(value: DecodedValue) {
  if (!value || typeof value !== 'object' || Seen.has(value)) return
  Seen.add(value)
  if (value instanceof StoreNode) {
    StoreRefMap.removeRef(value.id)
    removeNestedStoreRefs(value.value)
  } else if (Array.isArray(value)) {
    value.forEach(removeNestedStoreRefs)
  } else if (Object.getPrototypeOf(value) === Object.prototype) {
    Object.values(value).forEach(removeNestedStoreRefs)
  }
}

export function decodeValue(
  list: EncodedValue[],
  prevValue: DecodedValue | null,
  storeRefMap: StoreNodeMap,
): DecodedValue {
  StoreRefMap = storeRefMap

  Seen = new Set()
  removeNestedStoreRefs(prevValue)
  Seen = undefined as any

  List = list
  DecodedMap = new Map()
  const decoded = decode(0)
  // @ts-expect-error - we don't want to keep globals around
  List = DecodedMap = StoreRefMap = undefined

  return decoded
}
