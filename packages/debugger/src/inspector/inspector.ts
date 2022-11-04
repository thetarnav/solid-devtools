import { $PROXY } from 'solid-js'
import { Mapped, NodeID, NodeType, ValueType, ValueNodeId } from '@solid-devtools/shared/graph'
import { Core, Solid, ValueUpdateListener } from '../types'
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
import { NodeIDMap, encodeValue } from './serialize'
import { getStoreNodeName } from './store'

export class ValueNode {
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

export class ValueNodeMap {
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

// Globals set before collecting the owner details
let $nodeIdMap!: NodeIDMap<HTMLElement | Core.Store.StoreNode>
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
      name: getDisplayName(getStoreNodeName(value as Core.Store.StoreNode)),
      value: encodeValue(value, false, $nodeIdMap, undefined, true),
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
