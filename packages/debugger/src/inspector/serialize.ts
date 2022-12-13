import { unwrap } from 'solid-js/store'
import { Core, EncodedValue, NodeID, INFINITY, NAN, NEGATIVE_INFINITY, ValueType } from '../types'
import { isStoreNode } from '../main/utils'

// globals
let Deep: boolean
let NodeMap: NodeIDMap<HTMLElement | Core.Store.StoreNode>
let List: EncodedValue<true>[]
let Seen: WeakMap<object, number>
let HandleStore: ((storeNodeId: NodeID, storeNode: Core.Store.StoreNode) => void) | undefined

const encodeNonObject = (value: unknown): EncodedValue<true> => {
  switch (typeof value) {
    case 'number':
      if (value === Infinity) return { type: ValueType.Number, value: INFINITY }
      if (value === -Infinity) return { type: ValueType.Number, value: NEGATIVE_INFINITY }
      if (isNaN(value)) return { type: ValueType.Number, value: NAN }
      return { type: ValueType.Number, value }
    case 'boolean':
      return { type: ValueType.Boolean, value }
    case 'string':
      return { type: ValueType.String, value }
    case 'symbol':
      return { type: ValueType.Symbol, value: value.description || '' }
    case 'function':
      return { type: ValueType.Function, value: value.name }
    case 'object':
      return { type: ValueType.Null }
    default:
      return { type: ValueType.Undefined }
  }
}

function encode(value: unknown, inStore: boolean): number {
  if (!value || typeof value !== 'object') return List.push(encodeNonObject(value)) - 1

  const seen = Seen.get(value)
  if (seen !== undefined) return seen
  const encoded: EncodedValue<true> = {} as any
  const index = List.push(encoded) - 1
  Seen.set(value, index)

  // HTML Elements
  if (value instanceof Element) {
    encoded.type = ValueType.Element
    encoded.value = { name: value.localName, id: NodeMap.set(value) }
  }
  // Store Nodes
  else if (!inStore && isStoreNode(value)) {
    // might still pass in a proxy
    const node = unwrap(value)
    const id = NodeMap.set(node)
    HandleStore && HandleStore(id, node)
    encoded.type = ValueType.Store
    encoded.value = { value: encode(node, true), id }
  }
  // Arrays
  else if (Array.isArray(value)) {
    encoded.type = ValueType.Array
    encoded.value = value.length
    if (Deep) encoded.children = value.map(item => encode(item, inStore))
  } else {
    const name = Object.prototype.toString.call(value).slice(8, -1)
    // normal objects (records)
    if (name === 'Object') {
      encoded.type = ValueType.Object
      encoded.value = Object.keys(value).length
      if (Deep) {
        const children = (encoded.children = {} as { [key: string]: number })
        for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
          children[key] = descriptor.get ? -1 : encode(descriptor.value, inStore)
        }
      }
    }
    // custom objects
    else {
      encoded.type = ValueType.Instance
      encoded.value = name
    }
  }

  return index
}

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
  handleStore?: (storeNodeId: NodeID, storeNode: Core.Store.StoreNode) => void,
  inStore = false,
): EncodedValue<Deep>[] {
  Deep = deep
  NodeMap = nodeMap
  List = []
  Seen = new WeakMap()
  HandleStore = handleStore

  encode(value, inStore)
  const result = List

  // @ts-expect-error clear global values
  Deep = NodeMap = List = Seen = undefined

  return result
}

let LastId = 0

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
    id = (LastId++).toString(36)
    this.obj[id] = element
    this.map.set(element, id)
    return id
  }
}
