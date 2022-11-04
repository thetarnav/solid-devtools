import { Accessor, createEffect, onCleanup, untrack } from 'solid-js'
import { throttle, scheduleIdle } from '@solid-primitives/scheduled'
import { warn } from '@solid-devtools/shared/utils'
import { DebuggerEventHub } from '../main/plugin'
import { walkSolidRoot } from '../main/roots'
import { Core, EncodedValue, NodeID, Solid, ValueNodeId } from '../main/types'
import { makeSolidUpdateListener } from '../main/update'
import { NodeIDMap, encodeValue } from './serialize'
import { observeStoreNode, StoreUpdateData } from './store'
import { clearOwnerObservers, collectOwnerDetails, ValueNode, ValueNodeMap } from './inspector'

export type ValueNodeUpdate = { id: ValueNodeId; value: EncodedValue<boolean> }

export type StoreNodeUpdate = {
  valueNodeId: ValueNodeId
  storeId: NodeID
  path: readonly (string | number)[]
  property: string | number
  /**
   * `undefined` - property deleted;
   * `EncodedValue<true>` - property updated;
   * `number` - array length updated;
   */
  value: EncodedValue<true> | undefined | number
}
/** List of new keys — all of the values are getters, so they won't change */
export type ProxyPropsUpdate = { added: string[]; removed: string[] }
export type InspectorUpdate =
  | [type: 'value', update: ValueNodeUpdate]
  | [type: 'store', update: StoreNodeUpdate]
  | [type: 'props', update: ProxyPropsUpdate]

export type SetInspectedNodeData = null | { rootId: NodeID; nodeId: NodeID }
export type ToggleInspectedValueData = { id: ValueNodeId; selected: boolean }

/**
 * Plugin module
 */
export function createInspector(
  debuggerEnabled: Accessor<boolean>,
  { eventHub }: { eventHub: DebuggerEventHub },
) {
  let inspectedOwner: Solid.Owner | null = null
  let nodeIdMap = new NodeIDMap<HTMLElement | Core.Store.StoreNode>()
  let valueMap = new ValueNodeMap()
  let checkProxyProps: (() => { added: string[]; removed: string[] } | undefined) | undefined

  // Batch and dedupe inspector updates
  // these will include updates to signals, stores, props, and node value
  const { pushStoreUpdate, pushValueUpdate, triggerPropsCheck, clearUpdates } = (() => {
    let valueUpdates = new Set<ValueNodeId>()
    let storeUpdates: [valueNodeId: ValueNodeId, storeId: NodeID, data: StoreUpdateData][] = []
    let checkProps = false

    const flush = scheduleIdle(() => {
      const batchedUpdates: InspectorUpdate[] = []

      // Value Nodes (signals, props, and node value)
      for (const id of valueUpdates) {
        const node = valueMap.get(id)
        if (!node || !node.getValue) continue
        const selected = node.isSelected()
        const encoded = encodeValue(
          node.getValue(),
          selected,
          nodeIdMap,
          selected && handleStoreNode.bind(null, id, node),
        )
        batchedUpdates.push(['value', { id, value: encoded }])
      }
      valueUpdates.clear()

      // Stores
      for (const [valueNodeId, storeId, data] of storeUpdates)
        batchedUpdates.push([
          'store',
          {
            valueNodeId,
            storeId,
            value:
              'length' in data
                ? data.length
                : data.value === undefined
                ? undefined
                : encodeValue(data.value, true, nodeIdMap, undefined, true),
            path: data.path,
            property: data.property,
          },
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

    return {
      pushValueUpdate(id: ValueNodeId) {
        valueUpdates.add(id)
        flush()
      },
      pushStoreUpdate(valueNodeId: ValueNodeId, storeId: NodeID, data: StoreUpdateData) {
        storeUpdates.push([valueNodeId, storeId, data])
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

  function handleStoreNode(
    valueId: ValueNodeId,
    valueNode: ValueNode,
    storeNodeId: NodeID,
    storeNode: Core.Store.StoreNode,
  ) {
    valueNode.addStoreObserver(
      observeStoreNode(storeNode, data => pushStoreUpdate(valueId, storeNodeId, data)),
    )
  }

  function setInspectedDetails(owner: Solid.Owner | null) {
    inspectedOwner && clearOwnerObservers(inspectedOwner)
    inspectedOwner = owner
    checkProxyProps = undefined
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
      checkProxyProps = result.checkProxyProps
    })
  }

  createEffect(() => {
    if (!debuggerEnabled()) return

    // Clear the inspected owner when the debugger is disabled
    onCleanup(() => setInspectedDetails(null))

    makeSolidUpdateListener(() => {
      if (checkProxyProps) triggerPropsCheck()
    })
  })

  return {
    setInspectedNode(data: { rootId: NodeID; nodeId: NodeID } | null) {
      if (!data) return setInspectedDetails(null)
      const { rootId, nodeId } = data

      const walkResult = walkSolidRoot(rootId, nodeId)
      if (!walkResult || !walkResult.inspectedOwner) return setInspectedDetails(null)

      setInspectedDetails(walkResult.inspectedOwner)
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
