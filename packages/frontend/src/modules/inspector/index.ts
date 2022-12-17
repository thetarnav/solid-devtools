import { batch, createEffect, createMemo, createSelector, createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { defer, untrackedCallback, WritableDeep } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
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
  ValueType,
  LocationAttr,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  UNDEFINED,
} from '@solid-devtools/debugger/types'
import type { Structure } from '../structure'
import { Writable } from 'type-fest'

export class StoreNode {
  constructor(public id: NodeID, public value: DeserializedValue) {
    return createStore(this)[0]
  }
}
export class InstanceNode {
  constructor(public name: string) {
    return createStore(this)[0]
  }
}
export class FunctionNode {
  constructor(public name: string) {
    return createStore(this)[0]
  }
}
export class ElementNode {
  constructor(public id: NodeID, public name: string) {
    return createStore(this)[0]
  }
}
export class GetterNode {
  constructor(public name: string) {
    return createStore(this)[0]
  }
}
export class ObjectPreviewNode {
  constructor(public type: ValueType.Object | ValueType.Array, public length: number) {
    return createStore(this)[0]
  }
}

export type DeserializedValueMap = {
  [ValueType.String]: string
  [ValueType.Number]: number
  [ValueType.Boolean]: boolean
  [ValueType.Null]: null | undefined
  [ValueType.Symbol]: symbol
  [ValueType.Instance]: InstanceNode
  [ValueType.Function]: FunctionNode
  [ValueType.Element]: ElementNode
  [ValueType.Getter]: GetterNode
  [ValueType.Array]: ArrayDeserializedValue | ObjectPreviewNode
  [ValueType.Object]: ObjectDeserializedValue | ObjectPreviewNode
  [ValueType.Store]: StoreNode
}
// used interface instead of type to avoid circular dependency
interface ArrayDeserializedValue extends Array<DeserializedValue> {}
interface ObjectDeserializedValue extends Record<string, DeserializedValue> {}

export type DeserializedValue<T extends ValueType = ValueType> = DeserializedValueMap[T]

function deserializeEncodedValue(
  list: EncodedValue[],
  index: number = 0,
): DeserializedValueMap[ValueType] {
  const encoded = list[index]
  switch (encoded[0]) {
    case ValueType.String:
    case ValueType.Boolean:
      return encoded[1]
    case ValueType.Null:
      return encoded[1] === UNDEFINED ? undefined : null
    case ValueType.Number: {
      const [, data] = encoded
      return data === INFINITY
        ? Infinity
        : data === NEGATIVE_INFINITY
        ? -Infinity
        : data === NAN
        ? NaN
        : data
    }
    case ValueType.Instance:
      return new InstanceNode(encoded[1])
    case ValueType.Function:
      return new FunctionNode(encoded[1])
    case ValueType.Element:
      return new ElementNode(encoded[1].id, encoded[1].name)
    case ValueType.Symbol:
      return Symbol(encoded[1])
    case ValueType.Getter:
      return new GetterNode(encoded[1])
    case ValueType.Array:
    case ValueType.Object: {
      const [type, data] = encoded
      if (typeof data === 'number') {
        return new ObjectPreviewNode(type, data)
      }
      const value = data.constructor() as Record<string, unknown>
      for (const [key, index] of Object.entries(data)) {
        value[key] = index === -1 ? new GetterNode(key) : deserializeEncodedValue(list, index)
      }
      return value as ArrayDeserializedValue | ObjectDeserializedValue
    }
    case ValueType.Store: {
      const [, data] = encoded
      return new StoreNode(data.id, deserializeEncodedValue(list, data.value))
    }
  }
}

export namespace Inspector {
  export interface ValueItem {
    readonly itemId: ValueItemID
    readonly selected: boolean
    readonly value: DeserializedValue
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

function updateValueItem(
  details: WritableDeep<Inspector.SignalDetails>,
  { id: valueId, value }: ValueNodeUpdate,
): void {
  const [type, id] = splitValueNodeId(valueId)
  // Update signal/memo/store top-level value
  if (type === 'signal') {
    const signal = details.signals[id!]
    if (!signal) throw `updateValue: value node (${valueId}) not found`
    signal.value = deserializeEncodedValue(value)
  }
  // Update prop value
  else if (type === 'prop') {
    const prop = details.props?.record[id!]
    if (!prop) throw `updateValue: prop (${valueId}) not found`
    prop.value = deserializeEncodedValue(value)
  }
  // Update inspected node value
  else if (details.value) {
    details.value.value = deserializeEncodedValue(value)
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

function findStoreNode(obj: object, storeId: NodeID): StoreNode | undefined {
  if (obj instanceof StoreNode && obj.id === storeId) return obj
  for (const child of Object.values(obj) as unknown[]) {
    if (typeof child !== 'object' || !child) continue
    const store = findStoreNode(child, storeId)
    if (store) return store
  }
}

function findValueById(details: Inspector.SignalDetails, valueId: ValueItemID): unknown {
  const [type, id] = splitValueNodeId(valueId)
  if (type === 'signal') return details.signals[id!]?.value
  if (type === 'prop') return details.props?.record[id!]?.value
  return details.value?.value
}

function updateStore(
  details: WritableDeep<Inspector.SignalDetails>,
  { path, property, storeId, value: newValue, valueNodeId }: StoreNodeUpdate,
): void {
  const valueNode = findValueById(details, valueNodeId)
  if (!valueNode || typeof valueNode !== 'object')
    return warn(`updateStore: value node (${valueNodeId}) not found`)
  // TODO cache the store node
  const store = findStoreNode(valueNode, storeId)
  if (!store) return warn(`updateStore: store node (${storeId}) not found`)

  let value = store.value
  for (const key of path) {
    if (!value || typeof value !== 'object')
      throw new Error(`Invalid path ${[...path, property].join('.')}`)
    value = value[key as never]
  }
  if (!value || typeof value !== 'object')
    throw new Error(`Invalid path ${[...path, property].join('.')}`)

  if (newValue === undefined) {
    delete value[property as never]
  } else if (typeof newValue === 'number') {
    if (Array.isArray(value)) value.length = newValue
    else throw new Error(`Invalid path ${[...path, property].join('.')}`)
  } else {
    ;(value as any)[property] = deserializeEncodedValue(newValue)
  }
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
    // TODO: is mismatches are happening a lot on the owners view now
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
          value: deserializeEncodedValue(value),
          itemId: `signal:${id}`,
        }

      setSignalDetails({
        signals,
        value: raw.value
          ? { itemId: 'value', selected: false, value: deserializeEncodedValue(raw.value) }
          : undefined,
        props: raw.props
          ? {
              proxy: raw.props.proxy,
              record: Object.entries(raw.props.record).reduce((props, [propName, value]) => {
                props[propName] = {
                  value: deserializeEncodedValue(value),
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
