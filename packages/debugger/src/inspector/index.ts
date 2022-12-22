import { Accessor, createEffect, onCleanup, untrack } from 'solid-js'
import { throttle, scheduleIdle } from '@solid-primitives/scheduled'
import { warn } from '@solid-devtools/shared/utils'
import { Core, Mapped, NodeID, Solid, ValueItemID } from '../main/types'
import { NodeIDMap } from '../main/utils'
import { DebuggerEventHub } from '../main/plugin'
import { findOwnerById } from '../main/roots'
import { makeSolidUpdateListener } from '../main/update'
import { encodeValue } from './serialize'
import { observeStoreNode, setOnStoreNodeUpdate, StoreNodeProperty, StoreUpdateData } from './store'
import { clearOwnerObservers, collectOwnerDetails, ValueNodeMap } from './inspector'
import { EncodedValue } from './types'

export type ValueNodeUpdate = [id: ValueItemID, value: EncodedValue[]]

export type StoreNodeUpdate = [store: StoreNodeProperty, value: EncodedValue[] | null | number]
/** List of new keys — all of the values are getters, so they won't change */
export type ProxyPropsUpdate = { added: string[]; removed: string[] }
export type InspectorUpdate =
  | [type: 'value', update: ValueNodeUpdate]
  | [type: 'store', update: StoreNodeUpdate]
  | [type: 'props', update: ProxyPropsUpdate]

export type SetInspectedNodeData = null | { rootId: NodeID; nodeId: NodeID }
export type ToggleInspectedValueData = { id: ValueItemID; selected: boolean }

/**
 * Plugin module
 */
export function createInspector(
  debuggerEnabled: Accessor<boolean>,
  { eventHub }: { eventHub: DebuggerEventHub },
) {
  let lastDetails: Mapped.OwnerDetails | undefined
  let inspectedOwner: Solid.Owner | undefined
  let nodeIdMap = new NodeIDMap<Element | Core.Store.StoreNode>()
  let valueMap = new ValueNodeMap()
  let checkProxyProps: (() => { added: string[]; removed: string[] } | undefined) | undefined

  // Batch and dedupe inspector updates
  // these will include updates to signals, stores, props, and node value
  const { pushValueUpdate, triggerPropsCheck, clearUpdates } = (() => {
    let valueUpdates = new Set<ValueItemID>()
    let storeUpdates: [storeProperty: StoreNodeProperty, data: StoreUpdateData][] = []
    let checkProps = false

    const flush = scheduleIdle(() => {
      const batchedUpdates: InspectorUpdate[] = []

      // Value Nodes (signals, props, and owner value)
      for (const id of valueUpdates) {
        const node = valueMap.get(id)
        if (!node || !node.getValue) continue
        // TODO shouldn't the previous stores be unsubscribed here? after update, they might no longer be here
        const selected = node.isSelected()
        const encoded = encodeValue(
          node.getValue(),
          selected,
          nodeIdMap,
          selected && (storeNode => node.addStoreObserver(observeStoreNode(storeNode))),
        )
        batchedUpdates.push(['value', [id, encoded]])
      }
      valueUpdates.clear()

      // Stores
      for (const [storeProperty, data] of storeUpdates)
        batchedUpdates.push([
          'store',
          [
            storeProperty,
            typeof data === 'object'
              ? encodeValue(data.value, true, nodeIdMap, undefined, true)
              : data ?? null,
          ],
        ])
      storeUpdates = []

      // Props (top-level key check of proxy props object)
      if (checkProps && checkProxyProps) {
        const keys = checkProxyProps()
        if (keys) batchedUpdates.push(['props', { added: keys.added, removed: keys.removed }])
        checkProps = false
      }

      // Emit updates
      batchedUpdates.length && eventHub.emit('InspectorUpdate', batchedUpdates)
    })

    const flushPropsCheck = throttle(flush, 200)

    // Subscribe to any store updates
    // observed stores are managed by the store.ts module (only stores in selected values get observed)
    setOnStoreNodeUpdate((...payload) => {
      storeUpdates.push(payload)
      flush()
    })

    return {
      pushValueUpdate(id: ValueItemID) {
        valueUpdates.add(id)
        flush()
      },
      triggerPropsCheck() {
        checkProps = true
        flushPropsCheck()
      },
      // since the updates are emitten on timeout, we need to make sure that
      // switching off the debugger or unselecting the owner will clear the updates
      clearUpdates() {
        valueUpdates.clear()
        storeUpdates = []
        checkProps = false
        flush.clear()
        flushPropsCheck.clear()
      },
    }
  })()

  function setInspectedOwner(owner: Solid.Owner | undefined) {
    inspectedOwner && clearOwnerObservers(inspectedOwner)
    inspectedOwner = owner
    checkProxyProps = undefined
    lastDetails = undefined
    valueMap.reset()
    clearUpdates()
    if (!owner) return

    untrack(() => {
      const result = collectOwnerDetails(owner, {
        onSignalUpdate: id => pushValueUpdate(`signal:${id}`),
        onValueUpdate: () => pushValueUpdate('value'),
      })
      eventHub.emit('InspectedNodeDetails', result.details)
      valueMap = result.valueMap
      nodeIdMap = result.nodeIdMap
      lastDetails = result.details
      checkProxyProps = result.checkProxyProps
    })
  }

  createEffect(() => {
    if (!debuggerEnabled()) return

    // Clear the inspected owner when the debugger is disabled
    onCleanup(() => setInspectedOwner(undefined))

    makeSolidUpdateListener(() => {
      if (checkProxyProps) triggerPropsCheck()
    })
  })

  return {
    getLastDetails: () => lastDetails,
    setInspectedNode(data: { rootId: NodeID; nodeId: NodeID } | null) {
      if (!data) return setInspectedOwner(undefined)
      setInspectedOwner(findOwnerById(data.rootId, data.nodeId))
    },
    toggleValueNode({ id, selected }: ToggleInspectedValueData): void {
      const node = valueMap.get(id)
      if (!node) return warn('Could not find value node:', id)
      node.setSelected(selected)
      pushValueUpdate(id)
    },
    getElementById(id: NodeID): HTMLElement | undefined {
      const el = nodeIdMap.get(id)
      if (el instanceof HTMLElement) return el
    },
  }
}
