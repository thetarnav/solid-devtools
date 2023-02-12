import {
  Debugger,
  InspectorUpdate,
  InspectorUpdateMap,
  LocationAttr,
  NodeID,
  NodeType,
  PropGetterState,
  ToggleInspectedValueData,
  ValueItemID,
  ValueItemType,
  ValueType,
} from '@solid-devtools/debugger/types'
import { handleTupleUpdates } from '@solid-devtools/shared/primitives'
import { splitOnColon, warn } from '@solid-devtools/shared/utils'
import { shallowCopy } from '@solid-primitives/immutable'
import { createStaticStore } from '@solid-primitives/utils'
import { batch, createMemo, createSelector, createSignal, mergeProps, Setter } from 'solid-js'
import { Writable } from 'type-fest'
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
    readonly extended: boolean
    readonly setExtended: Setter<boolean>
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
    readonly name: string | null
    readonly type: NodeType | null
    readonly signals: { readonly [key: NodeID]: Signal }
    readonly value: ValueItem | null
    readonly props: Props | null
    readonly location: LocationAttr | null
  }

  export type Module = ReturnType<typeof createInspector>
}

function createValueItem(itemId: ValueItemID, initValue: DecodedValue): Inspector.ValueItem {
  const [selected, setSelected] = createSignal(false)
  const [value, setValue] = createSignal<DecodedValue>(initValue)
  return {
    itemId,
    get extended() {
      return selected()
    },
    setExtended: setSelected,
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

const NULL_STATE = {
  name: null,
  type: null,
  location: null,
  props: null,
  signals: {},
  value: null,
} as const satisfies Inspector.State

export type InspectorNodeId = {
  readonly ownerId: NodeID | null
  readonly signalId: NodeID | null
}
const NULL_INSPECTED_NODE = { ownerId: null, signalId: null } as const satisfies InspectorNodeId

export default function createInspector() {
  //
  // Inspected owner/signal
  //

  const [inspected, setInspected] = createStaticStore<InspectorNodeId>(NULL_INSPECTED_NODE)
  const inspectedNode = createMemo(() => ({ ...inspected }), void 0, {
    equals: (a, b) => a.ownerId === b.ownerId && a.signalId === b.signalId,
  })
  const isSomeNodeInspected = createMemo(
    () => inspected.ownerId !== null || inspected.signalId !== null,
  )
  const isInspected = createSelector<InspectorNodeId, NodeID>(
    inspectedNode,
    (id, node) => node.ownerId === id || node.signalId === id,
  )

  function setInspectedNode(ownerId: NodeID | null, signalId: NodeID | null) {
    batch(() => {
      const prev = inspected.ownerId
      setInspected({ ownerId, signalId })
      if (!prev || ownerId !== prev) {
        storeNodeMap.clear()
        setState({ ...NULL_STATE })
      }
    })
  }
  function setInspectedOwner(id: NodeID | null) {
    setInspectedNode(id, null)
  }
  function setInspectedSignal(id: NodeID | null) {
    setInspected(prev => ({ ownerId: prev.ownerId, signalId: id }))
  }

  //
  // Inspector state
  //

  const [state, setState] = createStaticStore<Inspector.State>({ ...NULL_STATE })

  const storeNodeMap = new StoreNodeMap()

  function setNewDetails(raw: Debugger.OutputChannels['InspectedNodeDetails']): void {
    // debugger will send null when the inspected node is not found
    if (!raw) {
      setInspected(prev => ({ ownerId: null, signalId: prev.signalId }))
      return
    }

    const id = inspected.ownerId
    batch(() => {
      // The current inspected node is not the same as the one that sent the details
      // (replace it with the new one)
      if (!id || id !== raw.id) setInspectedOwner(raw.id)

      setState({
        name: raw.name,
        type: raw.type,
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
        state.props.record[key]?.setGetter(getterState)
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
    if (selected !== undefined && item.extended === selected) return
    selected = item.setExtended(p => selected ?? !p)
    onInspectValue({ id: item.itemId, selected })
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
    inspected,
    inspectedNode,
    isSomeNodeInspected,
    state,
    setInspectedNode,
    setInspectedOwner,
    setInspectedSignal,
    isInspected,
    setDetails: setNewDetails,
    update: handleUpdates,
    inspectValueItem,
    onInspectedHandler: onInspectValue,
    setOnInspectValue,
    openComponentLocation,
    setOnOpenLocation,
  }
}
