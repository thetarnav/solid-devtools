import { batch, createEffect, createMemo, createSelector, createSignal } from 'solid-js'
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
  ValueItemID,
  ValueItemType,
  Mapped,
  EncodedValueOf,
  ValueType,
  LocationAttr,
} from '@solid-devtools/debugger/types'
import type { Structure } from '../structure'
import { Writable } from 'type-fest'

export namespace Inspector {
  export interface ValueItem {
    readonly itemId: ValueItemID
    readonly selected: boolean
    readonly value: EncodedValue
  }

  export interface Signal extends ValueItem {
    readonly type: NodeType.Signal | NodeType.Memo | NodeType.Store
    readonly name: string
    readonly id: NodeID
  }

  export type PropsRecord = Readonly<Record<string, ValueItem>>
  export type SignalsRecord = Readonly<Record<NodeID, Signal>>

  export interface Props {
    readonly proxy: boolean
    readonly record: PropsRecord
  }
  export interface SignalDetails {
    readonly signals: SignalsRecord
    readonly value: ValueItem | null
    readonly props: Props | null
  }

  export interface Details extends SignalDetails {
    readonly location: LocationAttr | null
    readonly path: readonly Structure.Node[]
  }
}

const splitValueNodeId = (id: ValueItemID) => {
  return id.split(':') as [ValueItemType, undefined | NodeID | string]
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

function updateValueNode(obj: { value: EncodedValue }, newValue: EncodedValue): void {
  if (obj.value.type === newValue.type) {
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

function findValueNode(
  details: Inspector.SignalDetails,
  valueId: ValueItemID,
): EncodedValue | undefined {
  const [type, id] = splitValueNodeId(valueId)
  if (type === 'signal') return details.signals[id!]?.value
  if (type === 'prop') return details.props?.record[id!]?.value
  return details.value?.value
}

function updateValueItem(
  details: WritableDeep<Inspector.SignalDetails>,
  { id: valueId, value }: ValueNodeUpdate,
): void {
  const [type, id] = splitValueNodeId(valueId)
  // Update signal/memo/store top-level value
  if (type === 'signal') {
    const signal = details.signals[id!]
    if (!signal) throw `updateValue: value node (${valueId}) not found`
    updateValueNode(signal, value)
  }
  // Update prop value
  else if (type === 'prop') {
    const prop = details.props?.record[id!]
    if (!prop) throw `updateValue: prop (${valueId}) not found`
    updateValueNode(prop, value)
  }
  // Update inspected node value
  else details.value && updateValueNode(details.value, value)
}

/**
 * Props — add/remove changed prop keys of an proxy object
 */
function updateProps(
  props: WritableDeep<Inspector.Props>,
  { added, removed }: ProxyPropsUpdate,
): void {
  for (const key of added)
    props.record[key] = {
      value: { type: ValueType.Getter, value: key },
      selected: false,
      itemId: `prop:${key}`,
    }
  for (const key of removed) delete props.record[key]
}

function updateStore(
  details: WritableDeep<Inspector.SignalDetails>,
  { path, property, storeId, value, valueNodeId }: StoreNodeUpdate,
): void {
  const valueNode = findValueNode(details, valueNodeId)
  if (!valueNode) return warn(`updateStore: value node (${valueNodeId}) not found`)
  // TODO cache the store node
  const store = findStoreNode(valueNode, storeId)
  if (!store) return warn(`updateStore: store node (${storeId}) not found`)
  reconcileValueAtPath(store.value.value, path, property, value)
}

export default function createInspector({
  getNodePath,
  findNode,
}: {
  getNodePath(node: Structure.Node): Structure.Node[]
  findNode(id: NodeID): Structure.Node | undefined
}) {
  const [inspectedId, setInspectedId] = createSignal<NodeID | null>(null)
  const [inspectedNode, setInspectedNode] = createSignal<Structure.Node | null>(null)
  const path = createMemo(() => {
    const node = inspectedNode()
    return node ? getNodePath(node) : []
  })
  const [location, setLocation] = createSignal<LocationAttr | null>(null)
  const [signalDetails, setSignalDetails] = createStore<Inspector.SignalDetails>({
    signals: {},
    value: null,
    props: null,
  })

  const details: Inspector.Details = {
    get path() {
      return path()
    },
    get location() {
      return location()
    },
    get props() {
      return signalDetails.props
    },
    get signals() {
      return signalDetails.signals
    },
    get value() {
      return signalDetails.value
    },
  }

  const isNodeInspected = createSelector<NodeID | null, NodeID>(() => inspectedNode()?.id ?? null)

  const setInspected: (data: Structure.Node | NodeID | null) => void = untrackedCallback(data => {
    batch(() => {
      if (data === null) {
        setInspectedId(null)
        setInspectedNode(null)
        return
      }

      const newId = typeof data === 'string' ? data : data.id
      if (newId === inspectedId()) return
      const node = typeof data === 'string' ? findNode(data) : data
      if (!node) return warn(`setInspected: node (${newId}) not found`)

      setInspectedId(newId)
      setInspectedNode(node)
      setLocation(null)
      setSignalDetails({ signals: {}, value: null, props: null })
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
    if (!node || node.id !== raw.id) return warn('setNewDetails: inspected node mismatch')

    batch(() => {
      setLocation(raw.location ?? null)

      const signals: Writable<Inspector.SignalsRecord> = {}
      for (const { id, name, type, value } of raw.signals)
        signals[id] = { id, name, type, selected: false, value, itemId: `signal:${id}` }

      setSignalDetails({
        signals,
        value: raw.value ? { itemId: 'value', selected: false, value: raw.value } : undefined,
        props: raw.props
          ? {
              proxy: raw.props.proxy,
              record: Object.entries(raw.props.record).reduce((props, [propName, value]) => {
                props[propName] = { value, selected: false, itemId: `prop:${propName}` }
                return props
              }, {} as Writable<Inspector.PropsRecord>),
            }
          : null,
      })
    })
  })

  // Handle Inspector updates comming from the debugger
  function handleUpdate(updates: InspectorUpdate[]) {
    setSignalDetails(
      produce(details => {
        for (const update of updates) {
          switch (update[0]) {
            case 'value':
              updateValueItem(details, update[1])
              break
            case 'props':
              details.props && updateProps(details.props, update[1])
              break
            case 'store':
              updateStore(details, update[1])
              break
          }
        }
      }),
    )
  }

  /** variable for a callback in bridge.ts */
  let onInspectNode: (node: Structure.Node | null) => void = () => {}
  let onInspectValue: (data: ToggleInspectedValueData) => void = () => {}
  const setOnInspectValue = (fn: typeof onInspectValue) => (onInspectValue = fn)
  const setOnInspectNode = (fn: typeof onInspectNode) => (onInspectNode = fn)

  createEffect(defer(inspectedNode, node => onInspectNode(node)))

  /**
   * Toggle the inspection of a value item (signal, prop, or owner value)
   */
  function inspectValueItem(type: 'value', id?: undefined, selected?: boolean): void
  function inspectValueItem(
    type: Exclude<ValueItemType, 'value'>,
    id: string,
    selected?: boolean,
  ): void
  function inspectValueItem(type: ValueItemType, id?: string, selected?: boolean): void {
    setSignalDetails(
      produce(details => {
        let item: Writable<Inspector.ValueItem> | undefined | null
        if (type === 'value') item = details.value
        else if (type === 'signal') item = details.signals[id!]
        else if (type === 'prop') item = details.props?.record[id!]
        if (!item) return
        item.selected = selected = selected ?? !item.selected
        onInspectValue({ id: item.itemId, selected })
      }),
    )
  }

  //
  // HOVERED ELEMENT
  //
  const [hoveredElement, setHoveredElement] = createSignal<string | null>(null)

  function toggleHoveredElement(id: NodeID, selected?: boolean) {
    setHoveredElement(p => (p === id ? (selected ? id : null) : selected ? id : p))
  }

  //
  // LOCATION
  //
  let onOpenLocation: VoidFunction
  const setOnOpenLocation = (fn: typeof onOpenLocation) => (onOpenLocation = fn)
  function openComponentLocation() {
    onOpenLocation()
  }

  return {
    inspectedId,
    inspectedNode,
    details,
    setInspectedNode: setInspected,
    isNodeInspected,
    setDetails: setNewDetails,
    update: handleUpdate,
    inspectValueItem,
    onInspectedHandler: onInspectValue,
    hoveredElement,
    toggleHoveredElement,
    handleStructureChange,
    setOnInspectValue,
    setOnInspectNode,
    openComponentLocation,
    setOnOpenLocation,
  }
}
