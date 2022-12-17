import { unwrap } from 'solid-js/store'
import { Core, NodeID } from '../types'
import { isStoreNode } from '../main/utils'

export const INFINITY = 'Infinity'
export const NEGATIVE_INFINITY = 'NegativeInfinity'
export const NAN = 'NaN'
export const UNDEFINED = 'undefined'

export enum ValueType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Null = 'null',
  Symbol = 'symbol',
  Array = 'array',
  Object = 'object',
  Function = 'function',
  Getter = 'getter',
  Element = 'element',
  Instance = 'instance',
  Store = 'store',
}

type EncodedValueDataMap = {
  [ValueType.Null]: null | typeof UNDEFINED
  [ValueType.Array]: number | number[]
  [ValueType.Object]: number | { [key: string]: number }
  [ValueType.Number]: number | typeof INFINITY | typeof NEGATIVE_INFINITY | typeof NAN
  [ValueType.Boolean]: boolean
  [ValueType.String]: string
  [ValueType.Symbol]: string
  [ValueType.Function]: string
  [ValueType.Getter]: string
  [ValueType.Element]: { name: string; id: NodeID }
  [ValueType.Instance]: string
  [ValueType.Store]: { value: number; id: NodeID }
}

export type EncodedValueMap = {
  [T in ValueType]: [type: T, data: EncodedValueDataMap[T]]
}
export type EncodedValue<T extends ValueType = ValueType> = EncodedValueMap[T]

// globals
let Deep: boolean
let NodeMap: NodeIDMap<HTMLElement | Core.Store.StoreNode>
let List: EncodedValue[]
let Seen: Map<unknown, number>
let HandleStore: ((storeNodeId: NodeID, storeNode: Core.Store.StoreNode) => void) | undefined

const encodeNonObject = (value: unknown): EncodedValue => {
  switch (typeof value) {
    case 'number':
      if (value === Infinity) return [ValueType.Number, INFINITY]
      if (value === -Infinity) return [ValueType.Number, NEGATIVE_INFINITY]
      if (isNaN(value)) return [ValueType.Number, NAN]
      return [ValueType.Number, value]
    case 'boolean':
      return [ValueType.Boolean, value]
    case 'string':
      return [ValueType.String, value]
    case 'symbol':
      return [ValueType.Symbol, value.description || '']
    case 'function':
      return [ValueType.Function, value.name]
    case 'object':
      return [ValueType.Null, null]
    default:
      return [ValueType.Null, UNDEFINED]
  }
}

function encode(value: unknown, inStore: boolean): number {
  const seen = Seen.get(value)
  if (seen !== undefined) return seen

  // Non-Objects
  if (!value || typeof value !== 'object') {
    const index = List.push(encodeNonObject(value)) - 1
    Seen.set(value, index)
    return index
  }

  const encoded: EncodedValue = [] as any
  const index = List.push(encoded) - 1
  Seen.set(value, index)

  // HTML Elements
  if (value instanceof Element) {
    encoded[0] = ValueType.Element
    encoded[1] = { name: value.localName, id: NodeMap.set(value) }
  }
  // Store Nodes
  else if (!inStore && isStoreNode(value)) {
    // might still pass in a proxy
    const node = unwrap(value)
    if (node === value) Seen.delete(value)
    const id = NodeMap.set(node)
    HandleStore && HandleStore(id, node)
    encoded[0] = ValueType.Store
    encoded[1] = { value: encode(node, true), id }
  }
  // Arrays
  else if (Array.isArray(value)) {
    encoded[0] = ValueType.Array
    if (Deep) encoded[1] = value.map(item => encode(item, inStore))
    else encoded[1] = value.length
  } else {
    const name = Object.prototype.toString.call(value).slice(8, -1)
    // normal objects (records)
    if (name === 'Object') {
      encoded[0] = ValueType.Object
      if (Deep) {
        const children = (encoded[1] = {} as { [key: string]: number })
        for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
          children[key] = descriptor.get ? -1 : encode(descriptor.value, inStore)
        }
      } else encoded[1] = Object.keys(value).length
    }
    // custom objects
    else {
      encoded[0] = ValueType.Instance
      encoded[1] = name
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
export function encodeValue(
  value: unknown,
  deep: boolean,
  nodeMap: NodeIDMap<HTMLElement | Core.Store.StoreNode>,
  handleStore?: (storeNodeId: NodeID, storeNode: Core.Store.StoreNode) => void,
  inStore = false,
): EncodedValue[] {
  Deep = deep
  NodeMap = nodeMap
  List = []
  Seen = new Map()
  HandleStore = handleStore

  encode(value, inStore)
  const result = List

  // @ts-expect-error clear global values
  Deep = NodeMap = List = Seen = undefined

  return result as any
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
