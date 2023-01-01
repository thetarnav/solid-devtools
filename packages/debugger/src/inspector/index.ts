import { warn } from '@solid-devtools/shared/utils'
import { scheduleIdle, throttle } from '@solid-primitives/scheduled'
import { Accessor, createEffect, onCleanup, untrack } from 'solid-js'
import { DebuggerEventHub } from '../main/plugin'
import { findOwnerById } from '../main/roots'
import { Core, Mapped, NodeID, Solid, ValueItemID } from '../main/types'
import { makeSolidUpdateListener } from '../main/update'
import { NodeIDMap } from '../main/utils'
import {
  clearOwnerObservers,
  collectOwnerDetails,
  ObservedPropsMap,
  ValueNodeMap,
} from './inspector'
import { encodeValue } from './serialize'
import { observeStoreNode, setOnStoreNodeUpdate, StoreNodeProperty, StoreUpdateData } from './store'
import { InspectorUpdate, InspectorUpdateMap, PropGetterState } from './types'

export * from './types'

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
  const propsMap: ObservedPropsMap = new WeakMap()
  /** compare props object with the previous one to see whats changed */
  let checkProxyProps: (() => InspectorUpdateMap['propKeys'] | null) | null

  // Batch and dedupe inspector updates
  // these will include updates to signals, stores, props, and node value
  const { pushPropState, pushValueUpdate, pushInspectToggle, triggerPropsCheck, clearUpdates } =
    (() => {
      const valueUpdates = new Map<ValueItemID, boolean | null>()
      let storeUpdates: [storeProperty: StoreNodeProperty, data: StoreUpdateData][] = []
      let checkProps = false
      let propStates: InspectorUpdateMap['propState'] = {}

      const flush = scheduleIdle(() => {
        const batchedUpdates: InspectorUpdate[] = []

        // Value Nodes (signals, props, and owner value)
        for (const [id, toggleChange] of valueUpdates) {
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
          batchedUpdates.push([toggleChange === null ? 'value' : 'inspectToggle', [id, encoded]])
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
          if (keys) batchedUpdates.push(['propKeys', keys])
          checkProps = false
        }

        // Prop states (stale or not)
        if (Object.keys(propStates).length) {
          batchedUpdates.push(['propState', propStates])
          propStates = {}
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
          valueUpdates.set(id, null)
          flush()
        },
        pushInspectToggle(id: ValueItemID, selected: boolean) {
          const current = valueUpdates.get(id)
          if (current === selected || current === null) return
          else if (current === !selected) valueUpdates.delete(id)
          else valueUpdates.set(id, selected)
          flush()
        },
        triggerPropsCheck() {
          checkProps = true
          flushPropsCheck()
        },
        pushPropState(key: string, state: PropGetterState) {
          propStates[key] = state
          flush()
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
    inspectedOwner && clearOwnerObservers(inspectedOwner, propsMap)
    inspectedOwner = owner
    checkProxyProps = null
    lastDetails = undefined
    valueMap.reset()
    clearUpdates()
    if (!owner) return

    untrack(() => {
      const result = collectOwnerDetails(owner, {
        onValueUpdate: pushValueUpdate,
        onPropStateChange: pushPropState,
        observedPropsMap: propsMap,
      })
      eventHub.emit('InspectedNodeDetails', result.details)
      valueMap = result.valueMap
      nodeIdMap = result.nodeIdMap
      lastDetails = result.details
      checkProxyProps = result.checkProxyProps || null
    })
  }

  createEffect(() => {
    if (!debuggerEnabled()) return

    // Clear the inspected owner when the debugger is disabled
    onCleanup(() => setInspectedOwner(undefined))

    // Check if proxy props have changed keys after each update queue
    makeSolidUpdateListener(() => checkProxyProps && triggerPropsCheck())
  })

  return {
    getLastDetails: () => lastDetails,
    setInspectedNode(data: SetInspectedNodeData) {
      if (!data) return setInspectedOwner(undefined)
      setInspectedOwner(findOwnerById(data.rootId, data.nodeId))
    },
    toggleValueNode({ id, selected }: ToggleInspectedValueData): void {
      const node = valueMap.get(id)
      if (!node) return warn('Could not find value node:', id)
      node.setSelected(selected)
      pushInspectToggle(id, selected)
    },
    getElementById(id: NodeID): HTMLElement | undefined {
      const el = nodeIdMap.get(id)
      if (el instanceof HTMLElement) return el
    },
  }
}
