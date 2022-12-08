import { untrack } from 'solid-js'
import { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import type { Core, Solid } from '../types'

//
// GLOBALS
//

const DEV = STORE_DEV!

const $listeners = new WeakMap<Core.Store.StoreNode, Solid.OnStoreNodeUpdate[]>()

// path solid global dev hook
globalThis._$onStoreNodeUpdate = (node, property, value, prev) => {
  const listeners = $listeners.get(node)
  if (listeners) for (const fn of listeners) fn(node, property, value, prev)
}

//
//

export type StoreUpdateData = { path: readonly (string | number)[]; property: string | number } & (
  | { value: unknown }
  | { length: number }
)
export type StoreUpdateHandler = (data: StoreUpdateData) => void

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

function matchHandler(
  { storePath, storeSymbol }: Solid.OnStoreNodeUpdate,
  symbol: symbol,
  path: readonly (string | number)[],
) {
  if (storeSymbol !== symbol || storePath.length !== path.length) return false
  if (storePath == path) return true
  for (let i = 0; i < storePath.length; i++) {
    // loose equality is intentional — we want to match numbers and strings as they access the same property
    if (storePath[i] != path[i]) return false
  }
  return true
}

export function observeStoreNode(
  rootNode: Core.Store.StoreNode,
  onUpdate: StoreUpdateHandler,
): VoidFunction {
  // might still pass in a proxy
  rootNode = unwrap(rootNode)

  const symbol = Symbol('inspect-store')

  return untrack(() => {
    trackStore(rootNode, [])
    return () => untrackStore(rootNode, [])
  })

  function trackStore(node: Core.Store.StoreNode, path: readonly (string | number)[]): void {
    const handlers = $listeners.get(node)
    if (handlers && handlers.some(fn => matchHandler(fn, symbol, path))) return

    const handler: Solid.OnStoreNodeUpdate = ((_, property, value, prev) => {
      if (typeof property === 'symbol') return
      const propertyPath = [...path, property] as const
      untrack(() => {
        if (property === 'length' && typeof value === 'number' && Array.isArray(node)) {
          // Update array length
          onUpdate({ path, property, length: value })
        } else {
          if (DEV.isWrappable(prev)) untrackStore(prev, propertyPath)
          if (DEV.isWrappable(value)) trackStore(value, propertyPath)
          onUpdate({ path, property, value })
        }
      })
    }) as Solid.OnStoreNodeUpdate
    handler.storePath = path
    handler.storeSymbol = symbol
    handlers ? handlers.push(handler) : $listeners.set(node, [handler])
    forEachStoreProp(node, (property, child) => trackStore(child, [...path, property]))
  }

  function untrackStore(node: Core.Store.StoreNode, path: readonly (string | number)[]) {
    const handlers = $listeners.get(node)
    if (!handlers) return
    const r = handlers.splice(
      handlers.findIndex(h => matchHandler(h, symbol, path)),
      1,
    )
    if (handlers.length === 0) $listeners.delete(node)
    if (r.length)
      forEachStoreProp(node, (property, child) => untrackStore(child, [...path, property]))
  }
}
