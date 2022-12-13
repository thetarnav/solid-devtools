import { unwrap } from 'solid-js/store'
import {
  Core,
  EncodedValue,
  EncodedValueOf,
  NodeID,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  ValueType,
} from '../types'
import { isStoreNode } from '../main/utils'

// TODO handle circular references

/**
 * Encodes any value to a JSON-serializable object.
 * @param value
 * @param deep shallow, or deep encoding
 * @param nodeMap for HTML elements and store nodes, to assign a unique ID to each element
 * @param handleStore handle encountered store nodes
 * @returns encoded value
 */
export function encodeValue<Deep extends boolean>(
  value: unknown,
  deep: Deep,
  nodeMap: NodeIDMap<HTMLElement | Core.Store.StoreNode>,
  handleStore?:
    | false
    | undefined
    | ((storeNodeId: NodeID, storeNode: Core.Store.StoreNode) => void),
  inStore = false,
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
      value: { name: value.localName, id: nodeMap.set(value) },
    }

  if (!inStore && isStoreNode(value)) {
    // might still pass in a proxy
    const node = unwrap(value)
    const id = nodeMap.set(node)
    handleStore && handleStore(id, node)
    return {
      type: ValueType.Store,
      value: {
        value: encodeValue(node, deep, nodeMap, undefined, true) as EncodedValue<boolean>,
        id,
      },
    }
  }

  if (Array.isArray(value)) {
    const payload = {
      type: ValueType.Array,
      value: value.length,
    } as EncodedValueOf<ValueType.Array>
    if (deep)
      (payload as EncodedValueOf<ValueType.Array, true>).children = value.map(item =>
        encodeValue(item, true, nodeMap, handleStore, inStore),
      )
    return payload
  }

  const s = Object.prototype.toString.call(value)
  const name = s.slice(8, -1)
  if (name === 'Object') {
    const obj = value as Record<PropertyKey, unknown>
    const payload: EncodedValueOf<ValueType.Object> = {
      type: ValueType.Object,
      value: Object.keys(obj).length,
    }
    if (deep) {
      const children = ((payload as unknown as EncodedValueOf<ValueType.Object, true>).children =
        {} as Record<string, EncodedValue<true>>)
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        children[key] = descriptor.get
          ? { type: ValueType.Getter, value: key }
          : encodeValue(descriptor.value, true, nodeMap, handleStore, inStore)
      }
    }
    return payload
  }

  return { type: ValueType.Instance, value: name }
}

let lastId = 0

export class NodeIDMap<T extends object> {
  private obj: Record<NodeID, T> = {}
  private map: WeakMap<T, NodeID> = new WeakMap()

  get(id: NodeID): T | undefined {
    return this.obj[id]
  }
  getId(element: T): NodeID | undefined {
    return this.map.get(element)
  }

  set(element: T): NodeID {
    let id = this.map.get(element)
    if (id !== undefined) return id
    id = (lastId++).toString(36)
    this.obj[id] = element
    this.map.set(element, id)
    return id
  }
}
