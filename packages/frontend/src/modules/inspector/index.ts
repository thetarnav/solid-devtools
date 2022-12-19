import { batch, createEffect, createMemo, createSelector, createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { defer, untrackedCallback, WritableDeep } from '@solid-devtools/shared/primitives'
import { splitOnColon, warn } from '@solid-devtools/shared/utils'
import {
  InspectorUpdate,
  ProxyPropsUpdate,
  StoreNodeUpdate,
  ToggleInspectedValueData,
  ValueNodeUpdate,
  NodeType,
  NodeID,
  ValueItemID,
  ValueItemType,
  Mapped,
  ValueType,
  LocationAttr,
} from '@solid-devtools/debugger/types'
import type { Structure } from '../structure'
import { Writable } from 'type-fest'
import { DecodedValue, decodeValue, StoreNodeMap } from './decode'

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

function updateValueItem(
  details: WritableDeep<Inspector.SignalDetails>,
  [valueId, value]: ValueNodeUpdate,
  storeNodeMap: StoreNodeMap,
): void {
  const [type, id] = splitOnColon(valueId)
  // Update signal/memo/store top-level value
  if (type === 'signal') {
    const signal = details.signals[id]
    if (!signal) throw `updateValue: value node (${valueId}) not found`
    signal.value = decodeValue(value, signal.value, storeNodeMap)
  }
  // Update prop value
  else if (type === 'prop') {
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

function updateStore([storeProperty, newValue]: StoreNodeUpdate, storeNodeMap: StoreNodeMap): void {
  const [storeNodeId, property] = splitOnColon(storeProperty)
  const store = storeNodeMap.get(storeNodeId)
  if (!store) throw `updateStore: store node (${storeNodeId}) not found`

  store.setState(
    'value',
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
  const [signalDetails, setSignalDetails] = createStore<Inspector.SignalDetails>({
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
        storeNodeMap.clear()
        return
      }

      const prev = inspectedNode()
      const newId = typeof data === 'string' ? data : data.id
      if (prev && newId === prev.id) return
      const node = typeof data === 'string' ? findNode(data) : data
      if (!node) return warn(`setInspected: node (${newId}) not found`)
      // html elements are not inspectable
      if (node.type === NodeType.Element) return

      setInspectedNode(node)
      setLocation(null)
      storeNodeMap.clear()
      setSignalDetails({ signals: {}, value: null, props: null })
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

      const signals: Writable<Inspector.SignalsRecord> = {}
      for (const { id, name, type, value } of raw.signals)
        signals[id] = {
          id,
          name,
          type,
          selected: false,
          value: decodeValue(value, null, storeNodeMap),
          itemId: `signal:${id}`,
        }

      setSignalDetails({
        signals,
        value: raw.value
          ? { itemId: 'value', selected: false, value: decodeValue(raw.value, null, storeNodeMap) }
          : undefined,
        props: raw.props
          ? {
              proxy: raw.props.proxy,
              record: Object.entries(raw.props.record).reduce((props, [propName, value]) => {
                props[propName] = {
                  value: decodeValue(value, null, storeNodeMap),
                  selected: false,
                  itemId: `prop:${propName}`,
                }
                return props
              }, {} as Writable<Inspector.PropsRecord>),
            }
          : null,
      })
    })
  })

  // Handle Inspector updates comming from the debugger
  function handleUpdate(updates: InspectorUpdate[]) {
    batch(() => {
      setSignalDetails(
        produce(details => {
          for (const update of updates) {
            switch (update[0]) {
              case 'value':
                updateValueItem(details, update[1], storeNodeMap)
                break
              case 'props':
                details.props && updateProps(details.props, update[1])
                break
              case 'store':
                updateStore(update[1], storeNodeMap)
                break
            }
          }
        }),
      )
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
  function inspectValueItem(type: 'value', id?: undefined, selected?: boolean): boolean
  function inspectValueItem(
    type: Exclude<ValueItemType, 'value'>,
    id: string,
    selected?: boolean,
  ): boolean
  function inspectValueItem(type: ValueItemType, id?: string, selected?: boolean): boolean {
    let toggledInspection = false
    setSignalDetails(
      produce(details => {
        let item: Writable<Inspector.ValueItem> | undefined | null
        if (type === 'value') item = details.value
        else if (type === 'signal') item = details.signals[id!]
        else if (type === 'prop') item = details.props?.record[id!]
        if (!item) return
        item.selected = selected = selected ?? !item.selected
        onInspectValue({ id: item.itemId, selected })
        toggledInspection = true
      }),
    )
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
