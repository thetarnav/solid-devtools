import { batch, createEffect, createSelector, createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { defer, untrackedCallback, WritableDeep } from '@solid-devtools/shared/primitives'
import { error, warn } from '@solid-devtools/shared/utils'
import {
  InspectorUpdate,
  ProxyPropsUpdate,
  StoreNodeUpdate,
  ToggleInspectedValueData,
  ValueNodeUpdate,
  NodeType,
  NodeID,
  EncodedValue,
  ValueNodeId,
  Mapped,
  ValueNodeType,
  EncodedValueOf,
  ValueType,
} from '@solid-devtools/debugger/types'
import type { Structure } from '../structure'

export namespace Inspector {
  export type Signal = Readonly<{
    type: NodeType.Signal | NodeType.Memo | NodeType.Store
    name: string
    id: NodeID
    value: EncodedValue
    selected: boolean
  }>

  export type Props = Readonly<{
    proxy: boolean
    record: Record<string, Readonly<{ selected: boolean; value: EncodedValue }>>
  }>

  export type Details = Readonly<{
    id: NodeID
    name: string
    type: NodeType
    path: Structure.Node[]
    signals: Readonly<Record<NodeID, Signal>>
    props?: Props
    value?: EncodedValue
    valueSelected: boolean
    // TODO: more to come
  }>
}

const splitValueNodeId = (id: ValueNodeId) => {
  return id.split(':') as [ValueNodeType, undefined | NodeID | string]
}

function createSignalNode(raw: Readonly<Mapped.Signal>): Inspector.Signal {
  return { ...raw, selected: false }
}

function createDetails(
  raw: Readonly<Mapped.OwnerDetails>,
  path: Structure.Node[],
): Inspector.Details {
  const signals = raw.signals.reduce((signals, signal) => {
    signals[signal.id] = createSignalNode(signal)
    return signals
  }, {} as Record<NodeID, Inspector.Signal>)
  const details: WritableDeep<Inspector.Details> = {
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
    if (!value.children) return error('Invalid path', fullPathString)
    value = value.children[key as never]
  }
  const children = value?.children
  if (!children) return error('Invalid path', fullPathString)
  if (newValue === undefined) delete children[property as never]
  else children[property as never] = newValue as any
}

const XOR = (a: unknown, b: unknown) => (a || b) && !(a && b)

function updateValueNode(obj: { value?: EncodedValue }, newValue: EncodedValue): void {
  if (obj.value && obj.value.type === newValue.type) {
    if (obj.value.type === ValueType.Store) {
      obj = obj.value.value
      newValue = (newValue as EncodedValueOf<ValueType.Store>).value.value
    }
    const expanded = XOR('children' in obj.value!, 'children' in newValue)
    if (expanded) {
      obj.value!.children = newValue.children
      return
    }
  }
  obj.value = newValue
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
  const [_state, setDetails] = createStore({ value: null as Inspector.Details | null })
  const details = () => _state.value

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
    if (!node) return warn('setDetails: no node is being inspected')
    setDetails('value', createDetails(raw, getNodePath(node)))
  })

  /**
   * Value node update
   */
  function updateValue(
    proxy: WritableDeep<Inspector.Details>,
    { id: valueId, value }: ValueNodeUpdate,
  ): void {
    const [type, id] = splitValueNodeId(valueId)
    // Update signal/memo/store top-level value
    if (type === 'signal') {
      const signal = proxy.signals[id!]
      if (!signal) throw `updateValue: value node (${valueId}) not found`
      updateValueNode(signal, value)
    }
    // Update prop value
    else if (type === 'prop') {
      const prop = proxy.props?.record[id!]
      if (!prop) throw `updateValue: prop (${valueId}) not found`
      updateValueNode(prop, value)
    }
    // Update inspected node value
    else updateValueNode(proxy, value)
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
    if (!valueNode) return warn(`updateStore: value node (${valueNodeId}) not found`)
    // TODO cache the store node
    const store = findStoreNode(valueNode, storeId)
    if (!store) return warn(`updateStore: store node (${storeId}) not found`)
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
