import { untrack } from 'solid-js'
import { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import { pushToArrayProp } from '@solid-devtools/shared/utils'
import { Core, Solid } from '../types'

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

export type StoreUpdateData = { path: readonly string[]; value: unknown }
export type StoreUpdateHandler = (data: StoreUpdateData) => void

export function observeStoreNode(
  rootNode: Solid.StoreNode,
  onUpdate: StoreUpdateHandler,
): VoidFunction {
  // might still pass in a proxy
  rootNode = unwrap(rootNode)

  const set = new WeakSet<Solid.StoreNode>()
  const symbol = Symbol('inspect-store')

  return untrack(() => {
    trackStore(rootNode, [])
    return () => untrackStore(rootNode)
  })

  function trackStore(node: Solid.StoreNode, path: readonly string[]): void {
    set.add(node)
    const handler: Solid.OnStoreNodeUpdate = ((_, property, value, deleting) => {
      if (typeof property === 'symbol') return
      property = property.toString()
      untrack(() => {
        const fullPath = [...path, property as string]
        onUpdate({ path: fullPath, value: deleting ? undefined : value })
        const prev = node[property] as Solid.StoreNode | Core.Store.NotWrappable
        // deleting not existing properties will fire an update as well
        if (deleting && !prev) return
        if (DEV.isWrappable(prev)) untrackStore(prev)
        if (DEV.isWrappable(value)) trackStore(value as Solid.StoreNode, fullPath)
      })
    }) as Solid.OnStoreNodeUpdate
    handler.symbol = symbol
    pushToArrayProp(node, DEV.$ON_UPDATE, handler)
    forEachStoreProp(node, (key, child) => !set.has(child) && trackStore(child, [...path, key]))
  }

  function untrackStore(node: Solid.StoreNode) {
    if (node[DEV.$ON_UPDATE]!.length === 1) delete node[DEV.$ON_UPDATE]
    else node[DEV.$ON_UPDATE] = node[DEV.$ON_UPDATE]!.filter(h => h.symbol !== symbol)
    set.delete(node)
    forEachStoreProp(node, (_, child) => set.has(child) && untrackStore(child))
  }
}
