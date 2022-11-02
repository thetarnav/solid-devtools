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

const matchesHandlerData = (
  { _$sdtData }: Solid.OnStoreNodeUpdate,
  { parent, symbol, property }: Solid.OnStoreNodeUpdate['_$sdtData'],
): boolean =>
  symbol === _$sdtData.symbol &&
  (parent ? parent === _$sdtData.parent && property == _$sdtData.property : true)

export function observeStoreNode(
  rootNode: Solid.StoreNode,
  onUpdate: StoreUpdateHandler,
): VoidFunction {
  // might still pass in a proxy
  rootNode = unwrap(rootNode)

  const symbol = Symbol('inspect-store')

  return untrack(() => {
    trackStore(rootNode, [], { symbol })
    return () => untrackStore(rootNode, { symbol })
  })

  function trackStore(
    node: Solid.StoreNode,
    path: readonly (string | number)[],
    handlerData: Solid.OnStoreNodeUpdate['_$sdtData'],
  ): void {
    console.log('trackStore', path.join('.'))

    if (node[DEV.$ON_UPDATE] && node[DEV.$ON_UPDATE]!.some(h => matchesHandlerData(h, handlerData)))
      return

    const handler: Solid.OnStoreNodeUpdate = ((_, property, value, prev) => {
      if (typeof property === 'symbol') return
      console.log('onUpdate', [...path, property].join('.'), value)
      const _handlerData: Solid.OnStoreNodeUpdate['_$sdtData'] = { symbol, parent: node, property }
      untrack(() => {
        if (property === 'length' && typeof value === 'number' && Array.isArray(node)) {
          // Update array length
          onUpdate({ path, property, length: value })
        } else {
          if (DEV.isWrappable(prev)) untrackStore(prev as Solid.StoreNode, _handlerData)
          if (DEV.isWrappable(value))
            trackStore(value as Solid.StoreNode, [...path, property], _handlerData)
          onUpdate({ path, property, value })
        }
      })
    }) as Solid.OnStoreNodeUpdate
    handler._$sdtData = handlerData
    pushToArrayProp(node, DEV.$ON_UPDATE, handler)
    forEachStoreProp(node, (property, child) => {
      trackStore(child, [...path, property], { symbol, parent: node, property })
    })
  }

  function untrackStore(node: Solid.StoreNode, handlerData: Solid.OnStoreNodeUpdate['_$sdtData']) {
    console.log('untrackStore', node, handlerData.property)
    let handlers = node[DEV.$ON_UPDATE]
    if (!handlers) return
    node[DEV.$ON_UPDATE] = handlers = handlers.filter(h => !matchesHandlerData(h, handlerData))
    if (handlers.length === 0) delete node[DEV.$ON_UPDATE]
    forEachStoreProp(node, (property, child) => {
      untrackStore(child, { symbol, parent: node, property })
    })
  }
}
