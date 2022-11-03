import { untrack } from 'solid-js'
import { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import { pushToArrayProp } from '@solid-devtools/shared/utils'
import { Solid } from '../types'

const DEV = STORE_DEV!

export const getStoreNodeName = (node: Solid.StoreNode): string => node[DEV.$NAME] || '(unnamed)'

function forEachStoreProp(
  node: Solid.StoreNode,
  fn: (key: string, node: Solid.StoreNode) => void,
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

export type StoreUpdateData = { path: readonly (string | number)[]; property: string | number } & (
  | { value: unknown }
  | { length: number }
)
export type StoreUpdateHandler = (data: StoreUpdateData) => void

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
  rootNode: Solid.StoreNode,
  onUpdate: StoreUpdateHandler,
): VoidFunction {
  // might still pass in a proxy
  rootNode = unwrap(rootNode)

  const symbol = Symbol('inspect-store')

  return untrack(() => {
    trackStore(rootNode, [])
    return () => untrackStore(rootNode, [])
  })

  function trackStore(node: Solid.StoreNode, path: readonly (string | number)[]): void {
    if (node[DEV.$ON_UPDATE])
      for (const h of node[DEV.$ON_UPDATE]!) {
        if (matchHandler(h, symbol, path)) return
      }

    const handler: Solid.OnStoreNodeUpdate = ((_, property, value, prev) => {
      if (typeof property === 'symbol') return
      const propertyPath = [...path, property] as const
      untrack(() => {
        if (property === 'length' && typeof value === 'number' && Array.isArray(node)) {
          // Update array length
          onUpdate({ path, property, length: value })
        } else {
          if (DEV.isWrappable(prev)) untrackStore(prev as Solid.StoreNode, propertyPath)
          if (DEV.isWrappable(value)) trackStore(value as Solid.StoreNode, propertyPath)
          onUpdate({ path, property, value })
        }
      })
    }) as Solid.OnStoreNodeUpdate
    handler.storePath = path
    handler.storeSymbol = symbol
    pushToArrayProp(node, DEV.$ON_UPDATE, handler)
    forEachStoreProp(node, (property, child) => trackStore(child, [...path, property]))
  }

  function untrackStore(node: Solid.StoreNode, path: readonly (string | number)[]) {
    let handlers = node[DEV.$ON_UPDATE]
    if (!handlers) return
    handlers.splice(
      handlers.findIndex(h => matchHandler(h, symbol, path)),
      1,
    )
    if (handlers.length === 0) delete node[DEV.$ON_UPDATE]
    forEachStoreProp(node, (property, child) => untrackStore(child, [...path, property]))
  }
}
