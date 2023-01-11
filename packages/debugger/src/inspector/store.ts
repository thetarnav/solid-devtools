import { untrack } from 'solid-js'
import { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import { getSdtId } from '../main/id'
import type { Core, NodeID } from '../types'

const DEV = STORE_DEV!

export type StoreNodeProperty = `${NodeID}:${string}`
/**
 * - `undefined` - property deleted;
 * - `{ value: unknown }` - property updated/added;
 * - `number` - array length updated;
 */
export type StoreUpdateData = { value: unknown } | number | undefined

type ParentProperty = StoreNodeProperty | symbol
/**
 * Map of all listened-to store nodes, and their parnet nodeId:property
 * (symbol means it is an observed root node)
 */
const Nodes = new WeakMap<Core.Store.StoreNode, Set<ParentProperty>>()

export type OnNodeUpdate = (property: StoreNodeProperty, data: StoreUpdateData) => void
let OnNodeUpdate: OnNodeUpdate | null = null
export function setOnStoreNodeUpdate(fn: OnNodeUpdate): void {
  OnNodeUpdate = fn
}

// path solid global dev hook
globalThis._$onStoreNodeUpdate = (node, property, value, prev) =>
  untrack(() => {
    if (!OnNodeUpdate || !Nodes.has(node) || typeof property === 'symbol') return

    property = property.toString()
    const storeProperty: StoreNodeProperty = `${getSdtId(node)}:${property}`
    // Update array length
    if (property === 'length' && typeof value === 'number' && Array.isArray(node)) {
      return OnNodeUpdate(storeProperty, value)
    }
    DEV.isWrappable(prev) && untrackStore(prev, storeProperty)
    // Delete property
    if (value === undefined) {
      OnNodeUpdate(storeProperty, undefined)
    }
    // Update/Set property
    else {
      OnNodeUpdate(storeProperty, { value })
      DEV.isWrappable(value) && trackStore(value, storeProperty)
    }
  })

export function observeStoreNode(rootNode: Core.Store.StoreNode): VoidFunction {
  // might still pass in a proxy
  rootNode = unwrap(rootNode)
  const symbol = Symbol('inspect-store')

  return untrack(() => {
    trackStore(rootNode, symbol)
    return () => untrackStore(rootNode, symbol)
  })
}

function trackStore(node: Core.Store.StoreNode, parent: ParentProperty): void {
  const data = Nodes.get(node)
  if (data) data.add(parent)
  else {
    Nodes.set(node, new Set([parent]))
    const id = getSdtId(node)
    forEachStoreProp(node, (key, child) => trackStore(child, `${id}:${key}`))
  }
}

function untrackStore(node: Core.Store.StoreNode, parent: ParentProperty): void {
  const data = Nodes.get(node)
  if (data && data.delete(parent)) {
    data.size === 0 && Nodes.delete(node)
    const id = getSdtId(node)
    forEachStoreProp(node, (key, child) => untrackStore(child, `${id}:${key}`))
  }
}

function forEachStoreProp(
  node: Core.Store.StoreNode,
  fn: (key: string, node: Core.Store.StoreNode) => void,
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i]
      DEV.isWrappable(child) && fn(i.toString(), child)
    }
  } else {
    for (const key in node) {
      const { value, get } = Object.getOwnPropertyDescriptor(node, key)!
      if (!get && DEV.isWrappable(value)) fn(key, value)
    }
  }
}
