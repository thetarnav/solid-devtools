import { $PROXY, Accessor, createEffect, onCleanup, untrack } from 'solid-js'
import { throttle } from '@solid-primitives/scheduled'
import {
  Mapped,
  NodeID,
  NodeType,
  EncodedValue,
  ValueType,
  ValueNodeId,
} from '@solid-devtools/shared/graph'
import { defferIdle } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { DebuggerEventHub } from '../plugin'
import { walkSolidRoot } from '../roots'
import { Solid, ValueUpdateListener } from '../types'
import { makeSolidUpdateListener, observeValueUpdate, removeValueUpdateObserver } from '../update'
import {
  getComponentRefreshNode,
  getDisplayName,
  getNodeName,
  getNodeType,
  isSolidComponent,
  isSolidComputation,
  isSolidMemo,
  isSolidStore,
  markNodeID,
  markNodesID,
  markOwnerName,
  markOwnerType,
} from '../utils'
import { NodeIDMap, encodeValue } from './serialize'
import { getStoreNodeName, observeStoreNode, StoreUpdateData } from './store'

export type ValueNodeUpdate = {
  type: 'value'
  id: ValueNodeId
  value: EncodedValue<boolean>
  updated: boolean
}
export type StoreNodeUpdate = {
  type: 'store'
  id: NodeID
  path: readonly string[]
  value: EncodedValue<true> | false
}
/** List of new keys — all of the values are getters, so they won't change */
export type ProxyPropsUpdate = { type: 'props'; added: string[]; removed: string[] }
export type InspectorUpdate = ValueNodeUpdate | StoreNodeUpdate | ProxyPropsUpdate

export type SetInspectedNodeData = null | { rootId: NodeID; nodeId: NodeID }
export type ToggleInspectedValueData = { id: ValueNodeId; selected: boolean }

class ValueNode {
  private trackedStores: VoidFunction[] = []
  private selected = false
  constructor(public getValue: (() => unknown) | undefined) {}
  addStoreObserver(unsub: VoidFunction) {
    this.trackedStores.push(unsub)
  }
  private unsubscribe() {
    for (const unsub of this.trackedStores) unsub()
    this.trackedStores = []
  }
  reset() {
    this.unsubscribe()
    this.selected = false
  }
  isSelected() {
    return this.selected
  }
  setSelected(selected: boolean) {
    this.selected = selected
    if (!selected) this.unsubscribe()
  }
}

class ValueNodeMap {
  private record = {} as Record<ValueNodeId, ValueNode>
  get(id: ValueNodeId): ValueNode | undefined {
    return this.record[id]
  }
  add(id: ValueNodeId, getValue: (() => unknown) | undefined) {
    this.record[id] = new ValueNode(getValue)
  }
  reset() {
    for (const signal of Object.values(this.record)) signal.reset()
  }
}

/**
 * Plugin module
 */
export function createInspector(
  debuggerEnabled: Accessor<boolean>,
  { eventHub }: { eventHub: DebuggerEventHub },
) {
  let inspectedOwner: Solid.Owner | null = null
  let nodeIdMap = new NodeIDMap<HTMLElement | Solid.StoreNode>()
  let valueMap = new ValueNodeMap()
  let checkProxyProps: (() => { added: string[]; removed: string[] } | undefined) | undefined

  // Batch and dedupe inspector updates
  // these will include updates to signals, stores, props, and node value
  const { pushStoreUpdate, pushValueUpdate, triggerPropsCheck, clearUpdates } = (() => {
    let valueUpdates: Partial<Record<ValueNodeId, boolean>> = {}
    let storeUpdates: [NodeID, StoreUpdateData][] = []
    let checkProps = false

    const flush = defferIdle(() => {
      const batchedUpdates: InspectorUpdate[] = []

      // Value Nodes (signals, props, and node value)
      for (const [id, updated] of Object.entries(valueUpdates) as [ValueNodeId, boolean][]) {
        const node = valueMap.get(id)
        if (!node || !node.getValue) continue
        const encoded = encodeValue(
          node.getValue(),
          node.isSelected(),
          nodeIdMap,
          handleStoreNode.bind(null, id, node),
        )
        batchedUpdates.push({ type: 'value', id, value: encoded, updated })
      }
      valueUpdates = {}

      // Stores
      for (const [id, data] of storeUpdates) {
        const value = data.value === undefined ? false : encodeValue(data.value, true, nodeIdMap)
        batchedUpdates.push({ type: 'store', id, path: data.path, value })
      }
      storeUpdates = []

      // Props (top-level key check of proxy props object)
      if (checkProps && checkProxyProps) {
        const keys = checkProxyProps()
        if (keys) batchedUpdates.push({ type: 'props', added: keys.added, removed: keys.removed })
        checkProps = false
      }

      // Emit updates
      batchedUpdates.length && eventHub.emit('InspectorUpdate', batchedUpdates)
    })

    const flushPropsCheck = throttle(flush, 200)

    return {
      pushValueUpdate(id: ValueNodeId, updated: boolean) {
        const existing = valueUpdates[id]
        if (existing === undefined || (updated && !existing)) valueUpdates[id] = updated
        flush()
      },
      pushStoreUpdate(id: NodeID, data: StoreUpdateData) {
        storeUpdates.push([id, data])
        flush()
      },
      triggerPropsCheck() {
        checkProps = true
        flushPropsCheck()
      },
      // since the updates are emitten on timeout, we need to make sure that
      // switching off the debugger or unselecting the owner will clear the updates
      clearUpdates() {
        valueUpdates = {}
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
    storeNode: Solid.StoreNode,
  ) {
    console.log(`TRACK store-node: ${storeNodeId} of ${valueId}:`, getStoreNodeName(storeNode))
    valueNode.addStoreObserver(
      observeStoreNode(storeNode, data => pushStoreUpdate(storeNodeId, data)),
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
        onSignalUpdate: id => pushValueUpdate(`signal:${id}`, true),
        onValueUpdate: () => pushValueUpdate('value', true),
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
      pushValueUpdate(id, false)
    },
    getElementById(id: NodeID): HTMLElement | undefined {
      const el = nodeIdMap.get(id)
      if (el instanceof HTMLElement) return el
    },
  }
}

// Globals set before collecting the owner details
let $nodeIdMap!: NodeIDMap<HTMLElement | Solid.StoreNode>
let $valueMap!: ValueNodeMap

const INSPECTOR = Symbol('inspector')

function mapSignalNode(
  node: Solid.Signal | Solid.Store,
  handler: (nodeId: NodeID, value: unknown) => void,
): Mapped.Signal {
  const { value } = node
  const id = markNodeID(node)
  $valueMap.add(`signal:${id}`, () => node.value)

  // Check if is a store
  if (isSolidStore(node)) {
    return {
      type: NodeType.Store,
      id,
      name: getDisplayName(getStoreNodeName(value as Solid.StoreNode)),
      value: encodeValue(value, false, $nodeIdMap),
      // TODO: top-level values can be observed too, it's the "_" property
      observers: [],
    }
  }

  observeValueUpdate(node, v => handler(id, v), INSPECTOR)

  return {
    type: getNodeType(node) as NodeType.Memo | NodeType.Signal,
    name: getNodeName(node),
    id,
    observers: markNodesID(node.observers),
    value: encodeValue(value, false, $nodeIdMap),
  }
}

export function clearOwnerObservers(owner: Solid.Owner): void {
  if (isSolidComputation(owner)) {
    removeValueUpdateObserver(owner, INSPECTOR)
  }
  if (owner.sourceMap) {
    for (const node of Object.values(owner.sourceMap)) removeValueUpdateObserver(node, INSPECTOR)
  }
  if (owner.owned) {
    for (const node of owner.owned) removeValueUpdateObserver(node, INSPECTOR)
  }
}

export function collectOwnerDetails(
  owner: Solid.Owner,
  config: {
    onSignalUpdate: (nodeId: NodeID, value: unknown) => void
    onValueUpdate: ValueUpdateListener
  },
) {
  const { onSignalUpdate, onValueUpdate } = config

  // Set globals
  $nodeIdMap = new NodeIDMap()
  $valueMap = new ValueNodeMap()

  const type = markOwnerType(owner)
  let { sourceMap, owned } = owner
  let getValue = () => owner.value

  // handle context node specially
  if (type === NodeType.Context) {
    sourceMap = undefined
    owned = null
    const symbols = Object.getOwnPropertySymbols(owner.context)
    if (symbols.length !== 1) {
      throw new Error('Context field has more than one symbol. This is not expected.')
    } else {
      const contextValue = owner.context[symbols[0]]
      getValue = () => contextValue
    }
  }

  // marge component with refresh memo
  let refresh: Solid.Memo | null
  if (isSolidComponent(owner) && (refresh = getComponentRefreshNode(owner))) {
    sourceMap = refresh.sourceMap
    owned = refresh.owned
    getValue = () => refresh!.value
  }

  // map signals
  let signals: Mapped.Signal[]
  if (sourceMap) {
    const signalNodes = Object.values(sourceMap)
    signals = Array(signalNodes.length)
    for (let i = 0; i < signalNodes.length; i++) {
      signals[i] = mapSignalNode(signalNodes[i], onSignalUpdate)
    }
  } else signals = []

  // map memos
  if (owned) {
    for (const node of owned) {
      if (isSolidMemo(node)) signals.push(mapSignalNode(node, onSignalUpdate))
    }
  }

  const details: Mapped.OwnerDetails = {
    id: markNodeID(owner),
    name: markOwnerName(owner),
    type: markOwnerType(owner),
    signals,
  }

  let checkProxyProps: (() => { added: string[]; removed: string[] } | undefined) | undefined

  if (isSolidComputation(owner)) {
    details.value = encodeValue(getValue(), false, $nodeIdMap)
    observeValueUpdate(owner, onValueUpdate, INSPECTOR)
    details.sources = markNodesID(owner.sources)
    if (isSolidMemo(owner)) {
      details.observers = markNodesID(owner.observers)
    }

    // Component Props
    if (isSolidComponent(owner)) {
      const { props } = owner
      // proxy props need to be checked for changes
      const proxy = !!(props as any)[$PROXY]
      const record: Mapped.Props['record'] = {}
      for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
        if (desc.get) {
          record[key] = { type: ValueType.Getter, value: key }
        } else {
          record[key] = encodeValue(desc.value, false, $nodeIdMap)
          // non-object props cannot be inspected (won't ever change and aren't deep)
          desc.value instanceof Object && $valueMap.add(`prop:${key}`, () => desc.value)
        }
      }
      details.props = { proxy, record }

      if (proxy) {
        let oldKeys: readonly string[] = Object.keys(record)
        checkProxyProps = () => {
          const newKeys = Object.keys(props)
          const added = new Set(newKeys)
          const removed: string[] = []
          let changed = false
          for (const key of oldKeys) {
            if (added.has(key)) added.delete(key)
            else {
              changed = true
              removed.push(key)
            }
          }
          if (!changed && !added.size) return
          oldKeys = newKeys
          return { added: Array.from(added), removed }
        }
      }
    }
  }

  $valueMap.add('value', getValue)

  return {
    details,
    valueMap: $valueMap,
    nodeIdMap: $nodeIdMap,
    checkProxyProps,
  }
}
