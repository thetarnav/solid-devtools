import {
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
import { defer, untrackedCallback } from '@solid-devtools/shared/primitives'
import { splitOnColon, warn } from '@solid-devtools/shared/utils'
import { createStaticStore } from '@solid-primitives/utils'
import {
  batch,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  mergeProps,
  Setter,
} from 'solid-js'
import { Writable } from 'type-fest'
import type { Structure } from '../structure'
import { DecodedValue, decodeValue, StoreNodeMap } from './decode'

export namespace Inspector {
  export type ValueItem = {
    readonly itemId: ValueItemID
    readonly selected: boolean
    readonly setSelected: Setter<boolean>
    readonly value: DecodedValue
    readonly setValue: Setter<DecodedValue>
  }

  export type Signal = ValueItem & {
    readonly type: NodeType.Signal | NodeType.Memo | NodeType.Store
    readonly name: string
    readonly id: NodeID
  }

  export type Prop = ValueItem & {
    readonly getter: PropGetterState | false
    readonly setGetter: Setter<PropGetterState>
  }

  export type Props = {
    readonly proxy: boolean
    readonly record: { readonly [key: string]: Prop }
  }

  export type Details = {
    readonly signals: { readonly [key: NodeID]: Signal }
    readonly value: ValueItem | null
    readonly props: Props | null
    readonly location: LocationAttr | null
    readonly path: readonly Structure.Node[]
  }
}

function createValueItem(itemId: ValueItemID, initValue: DecodedValue): Inspector.ValueItem {
  const [selected, setSelected] = createSignal(false)
  const [value, setValue] = createSignal<DecodedValue>(initValue)
  return {
    itemId,
    get selected() {
      return selected()
    },
    setSelected,
    get value() {
      return value()
    },
    setValue,
  }
}

function createSignalItem(
  id: NodeID,
  type: NodeType.Signal | NodeType.Memo | NodeType.Store,
  name: string,
  initValue: DecodedValue,
): Inspector.Signal {
  const valueItem = createValueItem(`${ValueItemType.Signal}:${id}`, initValue)
  return mergeProps(valueItem, { type, name, id })
}

function createPropItem(
  property: string,
  initValue: DecodedValue,
  initGetterState: PropGetterState | false,
): Inspector.Prop {
  const valueItem = createValueItem(`${ValueItemType.Prop}:${property}`, initValue)
  const [getter, setGetter] = createSignal(initGetterState)
  return mergeProps(valueItem, {
    get getter() {
      return getter()
    },
    setGetter,
  })
}

/**
 * Props — add/remove changed prop keys of an proxy object
 */
function updateProxyProps({
  added,
  removed,
}: InspectorUpdateMap['propKeys']): Parameters<Setter<Inspector.Details['props']>>[0] {
  return previous => {
    if (!previous) return null

    const record = { ...previous.record }
    for (const key of added)
      record[key] = createPropItem(key, { type: ValueType.Unknown }, PropGetterState.Stale)
    for (const key of removed) delete record[key]

    return { record, proxy: true }
  }
}

function updateStore(
  [storeProperty, newValue]: InspectorUpdateMap['store'],
  storeNodeMap: StoreNodeMap,
): void {
  const [storeNodeId, property] = splitOnColon(storeProperty)
  const store = storeNodeMap.get(storeNodeId)
  if (!store) throw `updateStore: store node (${storeNodeId}) not found`

  store.setValue(prevValue => {
    if (typeof prevValue === 'number') return prevValue
    const value = Array.isArray(prevValue) ? prevValue.slice() : { ...prevValue }
    if (newValue === null) {
      delete value[property as any]
    } else if (typeof newValue === 'number') {
      if (Array.isArray(value)) value.length = newValue
      else throw `updateStore: store node (${storeNodeId}) is not an array`
    } else {
      value[property as any] = decodeValue(newValue, value[property as any], storeNodeMap)
    }
    return value
  })
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

  const [state, setState] = createStaticStore<Omit<Inspector.Details, 'path'>>({
    location: null,
    props: null,
    signals: {},
    value: null,
  })
  const details: Inspector.Details = mergeProps(state, {
    get path() {
      return path()
    },
  })

  const storeNodeMap = new StoreNodeMap()

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

      storeNodeMap.clear()
      setState({
        location: null,
        props: null,
        signals: {},
        value: null,
      })
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

    setState({
      location: raw.location ?? null,
      signals: raw.signals.reduce((signals, { id, name, type, value }) => {
        signals[id] = createSignalItem(id, type, name, decodeValue(value, null, storeNodeMap))
        return signals
      }, {} as Writable<Inspector.Details['signals']>),
      value: raw.value
        ? createValueItem(ValueItemType.Value, decodeValue(raw.value, null, storeNodeMap))
        : null,
      props: raw.props
        ? {
            proxy: raw.props.proxy,
            record: Object.entries(raw.props.record).reduce((record, [key, p]) => {
              record[key] = createPropItem(
                key,
                p.value ? decodeValue(p.value, null, storeNodeMap) : { type: ValueType.Unknown },
                p.getter,
              )
              return record
            }, {} as Writable<Inspector.Props['record']>),
          }
        : null,
    })
  })

  // Handle Inspector updates comming from the debugger
  function handleUpdate(updates: InspectorUpdate[]) {
    batch(() => {
      for (const update of updates) {
        switch (update[0]) {
          case 'value': {
            const [valueId, value] = update[1]
            const [type, id] = splitOnColon(valueId)

            let valueItem: Inspector.ValueItem | undefined | null

            // Update signal/memo/store top-level value
            if (type === ValueItemType.Signal) valueItem = details.signals[id]
            // Update prop value
            else if (type === ValueItemType.Prop) valueItem = details.props?.record[id]
            // Update inspected node value
            else valueItem = details.value

            valueItem?.setValue(p => decodeValue(value, p, storeNodeMap))

            break
          }
          case 'propKeys':
            setState('props', updateProxyProps(update[1]))
            break
          case 'propState': {
            if (state.props) {
              for (const [key, getterState] of Object.entries(update[1])) {
                state.props.record[key]?.setGetter(p => (p ? getterState : p))
              }
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
    let item: Inspector.ValueItem | undefined | null
    if (type === ValueItemType.Value) item = state.value
    else if (type === ValueItemType.Signal) item = state.signals[id!]
    else if (type === ValueItemType.Prop) item = state.props?.record[id!]

    if (!item || (selected !== undefined && item.selected === selected)) return false

    selected = item.setSelected(p => selected ?? !p)
    onInspectValue({ id: item.itemId, selected })

    return true
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
