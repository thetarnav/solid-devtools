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
import { handleTupleUpdates, untrackedCallback } from '@solid-devtools/shared/primitives'
import { splitOnColon, warn } from '@solid-devtools/shared/utils'
import { shallowCopy } from '@solid-primitives/immutable'
import { createStaticStore } from '@solid-primitives/utils'
import { batch, createSelector, createSignal, mergeProps, Setter } from 'solid-js'
import { Writable } from 'type-fest'
import type { Structure } from '../structure'
import {
  DecodedValue,
  decodeValue,
  isObjectType,
  StoreNodeMap,
  updateCollapsedValue,
} from './decode'

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

  export type State = {
    readonly signals: { readonly [key: NodeID]: Signal }
    readonly value: ValueItem | null
    readonly props: Props | null
    readonly location: LocationAttr | null
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
}: InspectorUpdateMap['propKeys']): Parameters<Setter<Inspector.State['props']>>[0] {
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
  [storeProperty, newRawValue]: InspectorUpdateMap['store'],
  storeNodeMap: StoreNodeMap,
): void {
  const [storeNodeId, property] = splitOnColon(storeProperty)
  const store = storeNodeMap.get(storeNodeId)
  if (!store) throw `updateStore: store node (${storeNodeId}) not found`

  const value = store.value
  if (!value) throw `updateStore: store node (${storeNodeId}) has no value`

  const newValue = shallowCopy(value) as Record<string | number, DecodedValue>

  if (newRawValue === null) {
    delete newValue[property]
  } else if (typeof newRawValue === 'number') {
    if (Array.isArray(value)) value.length = newRawValue
    else throw `updateStore: store node (${storeNodeId}) is not an array`
  } else {
    newValue[property] = decodeValue(newRawValue, newValue[property]!, storeNodeMap)
  }
  store.setValue(newValue)
}

export default function createInspector({
  findNode,
}: {
  findNode(id: NodeID): Structure.Node | undefined
}) {
  const [inspectedId, setInspectedId] = createSignal<NodeID | null>(null)
  const isNodeInspected = createSelector<NodeID | null, NodeID>(inspectedId)

  const [state, setState] = createStaticStore<Inspector.State>({
    location: null,
    props: null,
    signals: {},
    value: null,
  })

  const storeNodeMap = new StoreNodeMap()

  const setInspected = untrackedCallback((id: NodeID | null) => {
    batch(() => {
      if (id === null) {
        setInspectedId(null)
      } else {
        const prev = inspectedId()
        if (prev && id === prev) return
        const node = findNode(id)
        if (!node) return warn(`setInspected: node (${id}) not found`)
        // html elements are not inspectable
        if (node.type === NodeType.Element) return

        setInspectedId(id)
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

  function setNewDetails(raw: Mapped.OwnerDetails): void {
    const id = inspectedId()
    batch(() => {
      // The current inspected node is not the same as the one that sent the details
      // (replace it with the new one)
      if (!id || id !== raw.id) setInspected(raw.id)

      setState({
        location: raw.location ?? null,
        signals: raw.signals.reduce((signals, s) => {
          signals[s.id] = createSignalItem(
            s.id,
            s.type,
            s.name,
            decodeValue(s.value, null, storeNodeMap),
          )
          return signals
        }, {} as Writable<Inspector.State['signals']>),
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
  }

  function getValueItem(valueId: ValueItemID): Inspector.ValueItem | undefined {
    const [valueItemType, id] = splitOnColon(valueId)

    let valueItem: Inspector.ValueItem | undefined | null

    if (valueItemType === ValueItemType.Signal) valueItem = state.signals[id]
    else if (valueItemType === ValueItemType.Prop) valueItem = state.props?.record[id]
    else valueItem = state.value

    return valueItem ?? warn(`ValueItem (${valueId}) not found`)
  }

  // Handle Inspector updates comming from the debugger
  const handleUpdates = handleTupleUpdates<InspectorUpdate>({
    value(update) {
      const [valueId, value] = update
      const valueItem = getValueItem(valueId)
      valueItem?.setValue(decodeValue(value, valueItem.value, storeNodeMap))
    },
    inspectToggle(update) {
      const [valueId, value] = update
      const valueItem = getValueItem(valueId)

      if (valueItem && isObjectType(valueItem.value))
        updateCollapsedValue(valueItem.value, value, storeNodeMap)
    },
    propKeys(update) {
      setState('props', updateProxyProps(update))
    },
    propState(update) {
      if (!state.props) return

      for (const [key, getterState] of Object.entries(update)) {
        state.props.record[key]?.setGetter(p => (p ? getterState : p))
      }
    },
    store(update) {
      updateStore(update, storeNodeMap)
    },
  })

  /** variable for a callback in controller.tsx */
  let onInspectValue: (data: ToggleInspectedValueData) => void = () => {}
  const setOnInspectValue = (fn: typeof onInspectValue) => (onInspectValue = fn)

  /**
   * Toggle the inspection of a value item (signal, prop, or owner value)
   */
  function inspectValueItem(item: Inspector.ValueItem, selected?: boolean): void {
    if (selected !== undefined && item.selected === selected) return
    selected = item.setSelected(p => selected ?? !p)
    onInspectValue({ id: item.itemId, selected })
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
    state,
    setInspectedNode: setInspected,
    isNodeInspected,
    setDetails: setNewDetails,
    update: handleUpdates,
    inspectValueItem,
    onInspectedHandler: onInspectValue,
    hoveredElement,
    toggleHoveredElement,
    setOnInspectValue,
    openComponentLocation,
    setOnOpenLocation,
  }
}
