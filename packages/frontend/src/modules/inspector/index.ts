import {
  EncodedValue,
  InspectorUpdate,
  InspectorUpdateMap,
  LocationAttr,
  Mapped,
  NodeID,
  NodeType,
  PropGetterState,
  ToggleInspectedValueData,
  ValueItemID,
  ValueItemType,
  ValueType,
} from '@solid-devtools/debugger/types'
import { defer, untrackedCallback, WritableDeep } from '@solid-devtools/shared/primitives'
import { splitOnColon, warn } from '@solid-devtools/shared/utils'
import { batch, createEffect, createMemo, createSelector, createSignal } from 'solid-js'
import { createMutable, produce } from 'solid-js/store'
import { Writable } from 'type-fest'
import type { Structure } from '../structure'
import { DecodedValue, decodeValue, StoreNodeMap, UnknownNode } from './decode'

export namespace Inspector {
  export interface ValueItem {
    readonly itemId: ValueItemID
    readonly selected: boolean
    readonly value: DecodedValue
  }

  export interface Signal extends ValueItem {
    readonly type: NodeType.Signal | NodeType.Memo | NodeType.Store
    readonly name: string
    readonly id: NodeID
  }

  export interface Prop extends ValueItem {
    readonly getter: PropGetterState | false
  }

  export interface Props {
    readonly proxy: boolean
    readonly record: {
      readonly [key: string]: Prop
    }
  }

  export interface SignalDetails {
    readonly signals: {
      readonly [key: NodeID]: Signal
    }
    readonly value: ValueItem | null
    readonly props: Props | null
  }

  export interface Details extends SignalDetails {
    readonly location: LocationAttr | null
    readonly path: readonly Structure.Node[]
  }
}

function createValueItem(
  itemId: ValueItemID,
  value: EncodedValue<ValueType>[] | UnknownNode,
  storeNodeMap: StoreNodeMap,
): Inspector.ValueItem {
  return {
    itemId,
    value: value instanceof UnknownNode ? value : decodeValue(value, null, storeNodeMap),
    selected: false,
  }
}

function updateValueItem(
  details: WritableDeep<Inspector.SignalDetails>,
  [valueId, value]: InspectorUpdateMap['value'],
  storeNodeMap: StoreNodeMap,
): void {
  const [type, id] = splitOnColon(valueId)
  // Update signal/memo/store top-level value
  if (type === ValueItemType.Signal) {
    const signal = details.signals[id]
    if (!signal) throw `updateValue: value node (${valueId}) not found`
    signal.value = decodeValue(value, signal.value, storeNodeMap)
  }
  // Update prop value
  else if (type === ValueItemType.Prop) {
    const prop = details.props?.record[id]
    if (!prop) throw `updateValue: prop (${valueId}) not found`
    prop.value = decodeValue(value, prop.value, storeNodeMap)
  }
  // Update inspected node value
  else if (details.value) {
    details.value.value = decodeValue(value, details.value.value, storeNodeMap)
  }
}

/**
 * Props — add/remove changed prop keys of an proxy object
 */
function updateProps(
  props: WritableDeep<Inspector.Props>,
  { added, removed }: InspectorUpdateMap['propKeys'],
): void {
  for (const key of added)
    props.record[key] = {
      getter: PropGetterState.Stale,
      itemId: `${ValueItemType.Prop}:${key}`,
      selected: false,
      value: new UnknownNode(),
    }
  for (const key of removed) delete props.record[key]
}

function updateStore(
  [storeProperty, newValue]: InspectorUpdateMap['store'],
  storeNodeMap: StoreNodeMap,
): void {
  const [storeNodeId, property] = splitOnColon(storeProperty)
  const store = storeNodeMap.get(storeNodeId)
  if (!store) throw `updateStore: store node (${storeNodeId}) not found`

  store.setState(
    produce(value => {
      if (!value || typeof value !== 'object')
        throw `updateStore: store node (${storeNodeId}) has no value`
      if (newValue === null) {
        delete value[property as never]
      } else if (typeof newValue === 'number') {
        if (Array.isArray(value)) value.length = newValue
        else throw `updateStore: store node (${storeNodeId}) is not an array`
      } else {
        ;(value as any)[property] = decodeValue(newValue, value[property as never], storeNodeMap)
      }
    }),
  )
}

export default function createInspector({
  getNodePath,
  findNode,
  findClosestInspectableNode,
}: {
  getNodePath(node: Structure.Node): Structure.Node[]
  findNode(id: NodeID): Structure.Node | undefined
  findClosestInspectableNode(node: Structure.Node): Structure.Node | undefined
}) {
  const [inspectedNode, setInspectedNode] = createSignal<Structure.Node | null>(null)
  const inspectedId = createMemo(() => inspectedNode()?.id ?? null)
  const path = createMemo(() => {
    const node = inspectedNode()
    return node ? getNodePath(node) : []
  })
  const [location, setLocation] = createSignal<LocationAttr | null>(null)
  // TODO: replace store with object and signals (we know which properties could be changed and which are static)
  const signalDetails = createMutable<WritableDeep<Inspector.SignalDetails>>({
    signals: {},
    value: null,
    props: null,
  })

  const storeNodeMap = new StoreNodeMap()

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
        setInspectedNode(null)
      } else {
        const prev = inspectedNode()
        const newId = typeof data === 'string' ? data : data.id
        if (prev && newId === prev.id) return
        const node = typeof data === 'string' ? findNode(data) : data
        if (!node) return warn(`setInspected: node (${newId}) not found`)
        // html elements are not inspectable
        if (node.type === NodeType.Element) return

        setInspectedNode(node)
      }

      setLocation(null)
      storeNodeMap.clear()
      signalDetails.signals = {}
      signalDetails.value = null
      signalDetails.props = null
    })
  })

  // clear the inspector when the inspected node is removed
  const handleStructureChange = untrackedCallback(() => {
    const prevNode = inspectedNode()
    if (!prevNode) return
    let node = findNode(prevNode.id)
    // if the previous inspected node is not found, try to find the closest component, context ot top-level root
    if (!node) {
      node = findClosestInspectableNode(prevNode)
      node &&= findNode(node.id)
    }
    setInspected(node ?? null)
  })

  const setNewDetails = untrackedCallback((raw: Mapped.OwnerDetails) => {
    const node = inspectedNode()
    if (!node || node.id !== raw.id) return warn('setNewDetails: inspected node mismatch')

    batch(() => {
      setLocation(raw.location ?? null)

      const signals: Writable<Inspector.Details['signals']> = {}
      for (const { id, name, type, value } of raw.signals)
        signals[id] = {
          id,
          name,
          type,
          selected: false,
          value: decodeValue(value, null, storeNodeMap),
          itemId: `${ValueItemType.Signal}:${id}`,
        }

      signalDetails.signals = signals
      signalDetails.value = raw.value
        ? createValueItem(ValueItemType.Value, raw.value, storeNodeMap)
        : null

      if (!raw.props) return (signalDetails.props = null)

      const propsRecord: WritableDeep<Inspector.Props['record']> = {}
      for (const [key, p] of Object.entries(raw.props.record))
        propsRecord[key] = {
          getter: p.getter ? PropGetterState.Stale : false,
          ...createValueItem(
            `${ValueItemType.Prop}:${key}`,
            p.value ? p.value : new UnknownNode(),
            storeNodeMap,
          ),
        }

      signalDetails.props = {
        proxy: raw.props.proxy,
        record: propsRecord,
      }
    })
  })

  // Handle Inspector updates comming from the debugger
  function handleUpdate(updates: InspectorUpdate[]) {
    batch(() => {
      for (const update of updates) {
        switch (update[0]) {
          case 'value':
            updateValueItem(signalDetails, update[1], storeNodeMap)
            break
          case 'propKeys':
            signalDetails.props && updateProps(signalDetails.props, update[1])
            break
          case 'propState': {
            for (const [key, isLive] of Object.entries(update[1])) {
              const prop = signalDetails.props?.record[key]
              if (prop && prop.getter && typeof isLive === 'boolean')
                prop.getter = PropGetterState[isLive ? 'Live' : 'Stale']
            }
            break
          }
          case 'store':
            updateStore(update[1], storeNodeMap)
            break
        }
      }
    })
  }

  /** variable for a callback in controller.tsx */
  let onInspectNode: (node: Structure.Node | null) => void = () => {}
  let onInspectValue: (data: ToggleInspectedValueData) => void = () => {}
  const setOnInspectValue = (fn: typeof onInspectValue) => (onInspectValue = fn)
  const setOnInspectNode = (fn: typeof onInspectNode) => (onInspectNode = fn)

  createEffect(defer(inspectedNode, node => onInspectNode(node)))

  /**
   * Toggle the inspection of a value item (signal, prop, or owner value)
   */
  function inspectValueItem(type: ValueItemType.Value, id?: undefined, selected?: boolean): boolean
  function inspectValueItem(
    type: Exclude<ValueItemType, ValueItemType.Value>,
    id: string,
    selected?: boolean,
  ): boolean
  function inspectValueItem(type: ValueItemType, id?: string, selected?: boolean): boolean {
    let toggledInspection = false

    let item: Writable<Inspector.ValueItem> | undefined | null
    if (type === ValueItemType.Value) item = signalDetails.value
    else if (type === ValueItemType.Signal) item = signalDetails.signals[id!]
    else if (type === ValueItemType.Prop) item = signalDetails.props?.record[id!]
    if (item) {
      item.selected = selected = selected ?? !item.selected
      onInspectValue({ id: item.itemId, selected })
      toggledInspection = true
    }
    return toggledInspection
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
