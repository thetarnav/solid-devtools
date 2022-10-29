import { $PROXY, Accessor, createEffect } from 'solid-js'
import { throttle } from '@solid-primitives/scheduled'
import {
  Mapped,
  NodeID,
  NodeType,
  EncodedValue,
  ValueType,
  ValueNodeId,
} from '@solid-devtools/shared/graph'
import { untrackedCallback } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { DebuggerEventHub } from '../plugin'
import { walkSolidRoot } from '../roots'
import { Solid, ValueUpdateListener } from '../types'
import { observeValueUpdate, removeValueUpdateObserver } from '../update'
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
import { NodeIDMap, encodeValue, HandleStoreNode } from './serialize'
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
  path: string[]
  value: EncodedValue<true> | false
}
export type InspectorUpdate = ValueNodeUpdate | StoreNodeUpdate

export type SetInspectedNodeData = null | { rootId: NodeID; nodeId: NodeID }
export type ToggleInspectedValueData = { id: ValueNodeId; selected: boolean }

class InspectedValue {
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

class InspectedValueMap {
  private record = {} as Record<ValueNodeId, InspectedValue>
  get(id: ValueNodeId) {
    return this.record[id]
  }
  add(id: ValueNodeId, getValue: (() => unknown) | undefined) {
    this.record[id] = new InspectedValue(getValue)
  }
  reset() {
    for (const signal of Object.values(this.record)) signal.reset()
  }
}

/**
 * Plugin module
 */
export function createInspector({
  debuggerEnabled,
  eventHub,
}: {
  debuggerEnabled: Accessor<boolean>
  eventHub: DebuggerEventHub
}) {
  let inspectedOwner: Solid.Owner | null = null
  let nodeIdMap = new NodeIDMap<HTMLElement | Solid.StoreNode>()
  let valueMap = new InspectedValueMap()

  const getIsEnabled = () => debuggerEnabled() || !!inspectedOwner

  const getElementById = (id: NodeID): HTMLElement | undefined => {
    const el = nodeIdMap.get(id)
    if (el instanceof HTMLElement) return el
  }

  const handleStoreNode: HandleStoreNode = (nodeId, storeNode) => {
    console.log(`TRACK STORE NODE, ${nodeId},`, getStoreNodeName(storeNode))
    // signal.addStoreObserver(
    //   observeStoreNode(storeNode, data => {
    //     console.log(`STORE NODE UPDATE, ${nodeId},`, getStoreNodeName(storeNode), data)
    //   }),
    // )
  }

  // Batch and dedupe inspector updates
  // these will include updates to signals, stores, props, and node value
  const { pushStoreUpdate, pushValueUpdate } = (() => {
    let valueUpdates: Partial<Record<ValueNodeId, boolean>> = {}
    let storeUpdates: [NodeID, StoreUpdateData][] = []

    const flush = throttle(() => {
      if (!getIsEnabled()) return

      const batchedUpdates: InspectorUpdate[] = []

      // Value Nodes (signals, props, and node value)
      for (const [id, updated] of Object.entries(valueUpdates) as [ValueNodeId, boolean][]) {
        const node = valueMap.get(id)
        if (!node.getValue) {
          warn(`No value getter for ${id}`)
          continue
        }
        const encoded = encodeValue(node.getValue(), node.isSelected(), nodeIdMap, handleStoreNode)
        batchedUpdates.push({ type: 'value', id, value: encoded, updated })
      }
      valueUpdates = {}

      // Stores
      stores: for (const [id, data] of storeUpdates) {
        const path: string[] = []
        const rawPath = data.path.slice()
        rawPath.push(data.property)
        for (const node of rawPath) {
          if (typeof node === 'symbol') {
            warn('Symbol path not supported', data)
            continue stores
          }
          path.push(node.toString())
        }
        const value = data.deleting ? false : encodeValue(data.value, true, nodeIdMap)
        batchedUpdates.push({ type: 'store', id, path, value })
      }
      storeUpdates = []

      // Emit updates
      eventHub.emit('InspectorUpdate', batchedUpdates)
    })

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
    }
  })()

  const setInspectedDetails = untrackedCallback((owner: Solid.Owner | null) => {
    inspectedOwner && clearOwnerObservers(inspectedOwner)
    inspectedOwner = owner
    valueMap.reset()
    if (!owner) return

    const result = collectOwnerDetails(owner, {
      onSignalUpdate: id => pushValueUpdate(`signal:${id}`, true),
      onValueUpdate: () => pushValueUpdate('value', true),
      handleStoreNode,
    })
    eventHub.emit('InspectedNodeDetails', result.details)
    valueMap = result.valueMap
    nodeIdMap = result.nodeIdMap
  })

  createEffect(() => {
    // make sure we clear the owner observers when the plugin is disabled
    if (!debuggerEnabled()) inspectedOwner && clearOwnerObservers(inspectedOwner)
    // re-observe the owner when the plugin is enabled
    else inspectedOwner && setInspectedDetails(inspectedOwner)
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
      if (!node) {
        console.warn('Could not find value node:', id)
        return
      }
      node.setSelected(selected)
      pushValueUpdate(id, false)
    },
    getElementById,
  }
}

// Globals set before collecting the owner details
let $nodeIdMap!: NodeIDMap<HTMLElement | Solid.StoreNode>
let $valueMap!: InspectedValueMap

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

export function encodeComponentProps(
  owner: Solid.Owner,
  nodeIdMap: NodeIDMap<HTMLElement | Solid.StoreNode>,
  propsMap: InspectedValueMap,
): Mapped.Props | null {
  if (!isSolidComponent(owner)) return null
  const { props } = owner
  const proxy = !!(props as any)[$PROXY]
  const record: Mapped.Props['record'] = {}
  for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
    record[key] = desc.get
      ? { type: ValueType.Getter, value: key }
      : encodeValue(desc.value, false, nodeIdMap)
    // getter props or non-object props cannot be inspected (won't ever change and aren't deep)
    propsMap.add(
      `prop:${key}`,
      desc.get || !(desc.value instanceof Object) ? undefined : () => desc.value,
    )
  }
  return { proxy, record }
}

export function collectOwnerDetails(
  owner: Solid.Owner,
  config: {
    onSignalUpdate: (nodeId: NodeID, value: unknown) => void
    onValueUpdate: ValueUpdateListener
    handleStoreNode: HandleStoreNode
  },
) {
  const { onSignalUpdate, onValueUpdate, handleStoreNode } = config

  // Set globals
  $nodeIdMap = new NodeIDMap()
  $valueMap = new InspectedValueMap()

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

  if (isSolidComputation(owner)) {
    details.value = encodeValue(getValue(), false, $nodeIdMap)
    observeValueUpdate(owner, onValueUpdate, INSPECTOR)
    details.sources = markNodesID(owner.sources)
    if (isSolidMemo(owner)) {
      details.observers = markNodesID(owner.observers)
    }
    // map component props
    const props = encodeComponentProps(owner, $nodeIdMap, $valueMap)
    if (props) details.props = props
  }

  $valueMap.add('value', getValue)

  return {
    details,
    valueMap: $valueMap,
    nodeIdMap: $nodeIdMap,
  }
}
