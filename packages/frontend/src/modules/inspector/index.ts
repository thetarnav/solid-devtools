import { batch, createEffect, createSelector, createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { Writable } from 'type-fest'
import { createSimpleEmitter } from '@solid-primitives/event-bus'
import {
  Mapped,
  NodeID,
  NodeType,
  EncodedValue,
  splitValueNodeId,
  ValueNodeId,
  ValueType,
  EncodedValueOf,
} from '@solid-devtools/shared/graph'
import { defer, untrackedCallback } from '@solid-devtools/shared/primitives'
import type {
  InspectorUpdate,
  ProxyPropsUpdate,
  StoreNodeUpdate,
  ToggleInspectedValueData,
  ValueNodeUpdate,
} from '@solid-devtools/debugger'
import type { Structure } from '../structure'

export namespace Inspector {
  export type Signal = {
    readonly type: NodeType.Signal | NodeType.Memo | NodeType.Store
    readonly name: string
    readonly id: NodeID
    readonly observers: NodeID[]
    readonly value: EncodedValue
    readonly selected: boolean
  }

  export type Props = {
    readonly proxy: boolean
    readonly record: Record<string, { readonly selected: boolean; readonly value: EncodedValue }>
  }

  export interface Details {
    readonly id: NodeID
    readonly name: string
    readonly type: NodeType
    readonly path: Structure.Node[]
    readonly signals: Record<NodeID, Signal>
    readonly props?: Props
    readonly value?: EncodedValue
    readonly valueSelected: boolean
    // TODO: more to come
  }
}

// TODO: this probably needs to be done when the inspected computation is rerun
// function reconcileSignals(
//   newSignals: readonly Mapped.Signal[],
//   signals: Record<NodeID, Inspector.Signal>,
// ): void {
//   const prev = new Set(Object.keys(signals))
//   for (const raw of newSignals) {
//     const { id } = raw
//     const signal = signals[id]
//     if (signal) {
//       // update signal observers
//       signal.observers.length = 0
//       signal.observers.push.apply(signal.observers, raw.observers)
//       // update signal value
//       reconcileValue(signal.value, raw.value)
//       prev.delete(id)
//     }
//     // add new signal
//     else signals[id] = createSignalNode(raw)
//   }
//   // remove signals
//   for (const id of prev) delete signals[id]
// }

function reconcileValue(proxy: EncodedValue, next: EncodedValue) {
  if (proxy.type !== next.type) {
    const assigned = new Set()
    for (const key in next) {
      ;(proxy as any)[key] = (next as any)[key]
      assigned.add(key)
    }
    for (const key in proxy) {
      if (!assigned.has(key)) delete (proxy as any)[key]
    }
  }
  proxy.type = next.type
  // value is a literal, so we can just assign it
  if ('value' in next) proxy.value = next.value
  else delete proxy.value
  if (next.children) {
    // add new children
    if (!proxy.children) (proxy as EncodedValue).children = next.children
    // reconcile children
    else {
      for (const key of Object.keys(proxy.children) as never[]) {
        // remove child
        if (!next.children[key]) delete proxy.children[key]
        // update child
        else reconcileValue(proxy.children[key], next.children[key])
      }
      for (const key of Object.keys(next.children) as never[]) {
        // add child
        if (!proxy.children[key]) proxy.children[key] = next.children[key]
      }
    }
  }
  // remove children
  else delete proxy.children
}

function createSignalNode(raw: Readonly<Mapped.Signal>): Inspector.Signal {
  return { ...raw, selected: false }
}

function reconcileProps(proxy: Writable<Inspector.Props>, raw: Mapped.Props): void {
  const record = proxy.record
  const newRecord = raw.record
  proxy.proxy = raw.proxy
  // the props cannot be deleted/added, so we can just update them
  for (const [key, prop] of Object.entries(record)) {
    const newProp = newRecord[key]
    if (!newProp) delete record[key]
    else reconcileValue(prop.value, newProp)
  }
  for (const [key, newProp] of Object.entries(newRecord)) {
    if (!record[key]) record[key] = { value: newProp, selected: false }
  }
}

function createDetails(
  raw: Readonly<Mapped.OwnerDetails>,
  path: Structure.Node[],
): Inspector.Details {
  const signals = raw.signals.reduce((signals, signal) => {
    signals[signal.id] = createSignalNode(signal)
    return signals
  }, {} as Inspector.Details['signals'])
  const details: Writable<Inspector.Details> = {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    path,
    signals,
    value: raw.value,
    valueSelected: false,
  }
  if (raw.props) {
    details.props = {
      proxy: raw.props.proxy,
      record: Object.entries(raw.props.record).reduce((props, [propName, value]) => {
        props[propName] = { value, selected: false }
        return props
      }, {} as Inspector.Props['record']),
    }
  }
  return details
}

function reconcileValueAtPath(
  value: EncodedValue,
  path: readonly (string | number)[],
  property: string | number,
  newValue: EncodedValue<true> | undefined | number,
): void {
  const fullPathString = [...path, property].join('.')
  for (const key of path) {
    if (!value.children) return console.error('Invalid path', fullPathString)
    value = value.children[key as never]
  }
  const children = value.children
  if (!children) return console.error('Invalid path', fullPathString)
  if (newValue === undefined) delete children[property as never]
  else children[property as never] = newValue as any
}

function findStoreNode(
  value: EncodedValue,
  storeId: NodeID,
): EncodedValueOf<ValueType.Store> | undefined {
  if (value.type === ValueType.Store && value.value.id === storeId) return value
  if (value.children) {
    for (const child of Object.values(value.children)) {
      const store = findStoreNode(child, storeId)
      if (store) return store
    }
  }
}

function findValueNode(details: Inspector.Details, valueId: ValueNodeId): EncodedValue | undefined {
  const [type, id] = splitValueNodeId(valueId)
  if (type === 'signal') return details.signals[id!]?.value
  if (type === 'prop') return details.props?.record[id!]?.value
  return details.value
}

export default function createInspector({
  getNodePath,
  findNode,
}: {
  getNodePath(node: Structure.Node): Structure.Node[]
  findNode(id: NodeID): Structure.Node | undefined
}) {
  const [inspectedNode, setInspectedNode] = createSignal<Structure.Node | null>(null)
  const [state, setDetails] = createStore<{ value: Inspector.Details | null }>({ value: null })
  const details = () => state.value

  const [listenToValueUpdates, emitValueUpdate] = createSimpleEmitter<ValueNodeId>()

  const isNodeInspected = createSelector<NodeID | null, NodeID>(() => inspectedNode()?.id ?? null)

  const setInspected: (data: Structure.Node | null | NodeID) => void = untrackedCallback(data => {
    batch(() => {
      if (data === null) {
        setInspectedNode(null)
        setDetails({ value: null })
        return
      }

      const currentNode = inspectedNode()
      if (typeof data === 'object') {
        if (currentNode && data.id === currentNode.id) return
        setInspectedNode(data)
        setDetails({ value: null })
      } else {
        if (currentNode && data === currentNode.id) return
        const node = findNode(data)
        if (!node) return
        setInspectedNode(node)
        setDetails({ value: null })
      }
    })
  })

  // clear the inspector when the inspected node is removed
  const handleStructureChange = untrackedCallback(() => {
    const node = inspectedNode()
    if (!node) return
    findNode(node.id) || setInspectedNode(null)
  })

  const setNewDetails = untrackedCallback((raw: Mapped.OwnerDetails) => {
    const node = inspectedNode()
    if (!node) return console.warn('setDetails: no node is being inspected')
    setDetails('value', createDetails(raw, getNodePath(node)))
  })

  /**
   * Value node update
   */
  function updateValue(
    proxy: Inspector.Details,
    { id: valueId, updated, value }: ValueNodeUpdate,
  ): void {
    const valueNode = findValueNode(proxy, valueId)
    if (!valueNode) return console.warn(`updateValue: value node (${valueId}) not found`)
    updated && emitValueUpdate(valueId)
    reconcileValue(valueNode, value)
  }

  /**
   * Props — add/remove changed prop keys of an proxy object
   */
  function updateProps(proxy: Inspector.Details, { added, removed }: ProxyPropsUpdate): void {
    const props = proxy.props!
    for (const key of added)
      props.record[key] = { value: { type: ValueType.Getter, value: key }, selected: false }
    for (const key of removed) delete props.record[key]
  }

  function updateStore(
    proxy: Inspector.Details,
    { path, property, storeId, value, valueNodeId }: StoreNodeUpdate,
  ): void {
    const valueNode = findValueNode(proxy, valueNodeId)
    if (!valueNode) return console.warn(`updateStore: value node (${valueNodeId}) not found`)
    // TODO cache the store node
    const store = findStoreNode(valueNode, storeId)
    if (!store) return console.warn(`updateStore: store node (${storeId}) not found`)
    reconcileValueAtPath(store.value.value, path, property, value)
  }

  // Handle Inspector updates comming from the debugger
  function handleUpdate(updates: InspectorUpdate[]) {
    setDetails(
      'value',
      produce(proxy => {
        if (!proxy) return
        for (const update of updates) {
          switch (update[0]) {
            case 'value':
              updateValue(proxy, update[1])
              break
            case 'props':
              updateProps(proxy, update[1])
              break
            case 'store':
              updateStore(proxy, update[1])
              break
          }
        }
      }),
    )
  }

  /** variable for a callback in bridge.ts */
  let onInspectedNodeHandler: (node: Structure.Node | null) => void = () => {}
  let onInspectedValueHandler: (data: ToggleInspectedValueData) => void = () => {}
  const setOnInspectedValueHandler = (fn: typeof onInspectedValueHandler) =>
    (onInspectedValueHandler = fn)
  const setOnInspectedNodeHandler = (fn: typeof onInspectedNodeHandler) =>
    (onInspectedNodeHandler = fn)

  createEffect(defer(inspectedNode, node => onInspectedNodeHandler(node)))

  function togglePropSelection(id: string, selected?: boolean): void {
    setDetails('value', 'props', 'record', id, 'selected', p => (selected = selected ?? !p))
    onInspectedValueHandler({ id: `prop:${id}`, selected: selected! })
  }
  function toggleSignalSelection(id: NodeID, selected?: boolean) {
    setDetails('value', 'signals', id, 'selected', p => (selected = selected ?? !p))
    onInspectedValueHandler({ id: `signal:${id}`, selected: selected! })
  }
  function toggleValueSelection(selected?: boolean) {
    setDetails('value', 'valueSelected', p => (selected = selected ?? !p))
    onInspectedValueHandler({ id: 'value', selected: selected! })
  }

  //
  // HOVERED ELEMENT
  //
  const [hoveredElement, setHoveredElement] = createSignal<string | null>(null)

  function toggleHoveredElement(id: NodeID, selected?: boolean) {
    setHoveredElement(p => (p === id ? (selected ? id : null) : selected ? id : p))
  }

  return {
    inspectedNode,
    details,
    listenToValueUpdates,
    setInspectedNode: setInspected,
    isNodeInspected,
    setDetails: setNewDetails,
    update: handleUpdate,
    toggleSignalSelection,
    toggleValueSelection,
    togglePropSelection,
    onInspectedHandler: onInspectedValueHandler,
    hoveredElement,
    toggleHoveredElement,
    handleStructureChange,
    setOnInspectedValueHandler,
    setOnInspectedNodeHandler,
  }
}
