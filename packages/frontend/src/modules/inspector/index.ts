import * as debug from '@solid-devtools/debugger/types'
import {handleTupleUpdates} from '@solid-devtools/shared/primitives'
import {splitOnColon, warn} from '@solid-devtools/shared/utils'
import {createStaticStore} from '@solid-primitives/static-store'
import {defer} from '@solid-primitives/utils'
import * as s from 'solid-js'
import type {DebuggerBridge} from '../../controller'
import * as decode from './decode'

export namespace Inspector {
    export type ValueItem = {
        itemId: debug.ValueItemID
        extended: boolean
        setExtended: s.Setter<boolean>
        value: decode.DecodedValue
        setValue: s.Setter<decode.DecodedValue>
    }

    export type Signal = ValueItem & {
        type: debug.NodeType.Signal | debug.NodeType.Memo | debug.NodeType.Store
        name: string | undefined
        id: debug.NodeID
    }

    export type Prop = ValueItem & {
        getter: debug.PropGetterState | false
        setGetter: s.Setter<debug.PropGetterState>
    }

    export type Props = {
        proxy: boolean
        record: {[key: string]: Prop}
    }

    export type State = {
        name: string | null
        type: debug.NodeType | null
        signals: {[key: debug.NodeID]: Signal}
        value: ValueItem | null
        props: Props | null
        location: string | null
    }

    export type Module = ReturnType<typeof createInspector>
}

function createValueItem(
    itemId: debug.ValueItemID,
    initValue: decode.DecodedValue,
): Inspector.ValueItem {
    const [selected, setSelected] = s.createSignal(false)
    const [value, setValue] = s.createSignal<decode.DecodedValue>(initValue)
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
    id: debug.NodeID,
    type: debug.NodeType.Signal | debug.NodeType.Memo | debug.NodeType.Store,
    name: string | undefined,
    initValue: decode.DecodedValue,
): Inspector.Signal {
    const valueItem = createValueItem(`${debug.ValueItemType.Signal}:${id}`, initValue)
    return s.mergeProps(valueItem, {type, name, id})
}

function createPropItem(
    property: string,
    initValue: decode.DecodedValue,
    initGetterState: debug.PropGetterState | false,
): Inspector.Prop {
    const valueItem = createValueItem(`${debug.ValueItemType.Prop}:${property}`, initValue)
    const [getter, setGetter] = s.createSignal(initGetterState)
    return s.mergeProps(valueItem, {
        get getter() {
            return getter()
        },
        setGetter: setGetter as any,
    })
}

/**
 * Props — add/remove changed prop keys of an proxy object
 */
function updateProxyProps({
    added,
    removed,
}: debug.InspectorUpdateMap['propKeys']): Parameters<s.Setter<Inspector.State['props']>>[0] {
    return previous => {
        if (!previous) return null

        const record = {...previous.record}
        for (const key of added)
            record[key] = createPropItem(
                key,
                {type: debug.ValueType.Unknown},
                debug.PropGetterState.Stale,
            )
        for (const key of removed) delete record[key]

        return {record, proxy: true}
    }
}

function updateStore(
    [storeProperty, newRawValue]: debug.InspectorUpdateMap['store'],
    storeNodeMap: decode.StoreNodeMap,
): void {
    const [storeNodeId, property] = splitOnColon(storeProperty)
    const store = storeNodeMap.get(storeNodeId)
    if (!store) throw `updateStore: store node (${storeNodeId}) not found`

    const value = store.value
    if (!value) throw `updateStore: store node (${storeNodeId}) has no value`

    const newValue = (Array.isArray(value) ? value.slice() : {...value}) as {[key: string]: any}

    if (newRawValue === null) {
        delete newValue[property]
    } else if (typeof newRawValue === 'number') {
        if (Array.isArray(value)) value.length = newRawValue
        else throw `updateStore: store node (${storeNodeId}) is not an array`
    } else {
        newValue[property] = decode.decodeValue(newRawValue, newValue[property]!, storeNodeMap)
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

const NULL_INSPECTED_NODE = {
    ownerId: null,
    signalId: null,
    treeWalkerOwnerId: null,
} as const satisfies debug.Debugger.InspectedState

export default function createInspector({bridge}: {bridge: DebuggerBridge}) {
    //
    // Inspected owner/signal
    //

    const [inspected, setInspected] =
        createStaticStore<debug.Debugger.InspectedState>(NULL_INSPECTED_NODE)
    const inspectedNode = s.createMemo(() => ({...inspected}), void 0, {
        equals: (a, b) => a.ownerId === b.ownerId && a.signalId === b.signalId,
    })
    const isSomeNodeInspected = s.createMemo(
        () => inspected.ownerId !== null || inspected.signalId !== null,
    )
    const isInspected = s.createSelector<debug.Debugger.InspectedState, debug.NodeID>(
        inspectedNode,
        (id, node) => node.ownerId === id || node.signalId === id,
    )
    const isInspectedTreeWalkerOwner = s.createSelector<debug.NodeID | null, debug.NodeID>(
        () => inspected.treeWalkerOwnerId,
    )

    function setInspectedNode(ownerId: debug.NodeID | null, signalId: debug.NodeID | null): void {
        s.batch(() => {
            const prev = inspected.ownerId
            setInspected({ownerId, signalId})
            if (!prev || ownerId !== prev) {
                storeNodeMap.clear()
                setState({...NULL_STATE})
            }
        })
    }
    function setInspectedOwner(id: debug.NodeID | null): void {
        setInspectedNode(id, null)
    }
    function toggleInspectedOwner(id: debug.NodeID): void {
        setInspectedNode(inspected.ownerId === id ? null : id, null)
    }
    function setInspectedSignal(id: debug.NodeID | null): void {
        setInspected(prev => ({ownerId: prev.ownerId, signalId: id}))
    }

    // sync inspected node with the debugger
    s.createEffect(defer(inspectedNode, bridge.output.InspectNode.emit))

    //
    // Inspector state
    //

    const [state, setState] = createStaticStore<Inspector.State>({...NULL_STATE})

    const storeNodeMap = new decode.StoreNodeMap()

    bridge.input.InspectedState.listen(newState => {
        s.batch(() => {
            const prev = inspected.ownerId
            setInspected(newState)
            if (newState.ownerId !== prev) setState({...NULL_STATE})
        })
    })

    bridge.input.InspectedNodeDetails.listen(function (raw) {
        const id = inspected.ownerId
        s.batch(() => {
            // The current inspected node is not the same as the one that sent the details
            // (replace it with the new one)
            if (!id || id !== raw.id) setInspectedOwner(raw.id)

            setState({
                name: raw.name,
                type: raw.type,
                location: raw.location?.file ?? null,
                signals: raw.signals.reduce(
                    (signals, s) => {
                        signals[s.id] = createSignalItem(
                            s.id,
                            s.type,
                            s.name,
                            decode.decodeValue(s.value, null, storeNodeMap),
                        )
                        return signals
                    },
                    {} as Inspector.State['signals'],
                ),
                value: raw.value
                    ? createValueItem(
                          debug.ValueItemType.Value,
                          decode.decodeValue(raw.value, null, storeNodeMap),
                      )
                    : null,
                props: raw.props
                    ? {
                          proxy: raw.props.proxy,
                          record: Object.entries(raw.props.record).reduce(
                              (record, [key, p]) => {
                                  record[key] = createPropItem(
                                      key,
                                      p.value
                                          ? decode.decodeValue(p.value, null, storeNodeMap)
                                          : {type: debug.ValueType.Unknown},
                                      p.getter,
                                  )
                                  return record
                              },
                              {} as Inspector.Props['record'],
                          ),
                      }
                    : null,
            })
        })
    })

    function getValueItem(valueId: debug.ValueItemID): Inspector.ValueItem | undefined {
        const [valueItemType, id] = splitOnColon(valueId)

        let valueItem: Inspector.ValueItem | undefined | null

        if (valueItemType === debug.ValueItemType.Signal) valueItem = state.signals[id]
        else if (valueItemType === debug.ValueItemType.Prop) valueItem = state.props?.record[id]
        else valueItem = state.value

        return valueItem ?? warn(`ValueItem (${valueId}) not found`)
    }

    bridge.input.InspectorUpdate.listen(
        handleTupleUpdates({
            value(update) {
                const [valueId, value] = update
                const valueItem = getValueItem(valueId)
                valueItem?.setValue(decode.decodeValue(value, valueItem.value, storeNodeMap))
            },
            inspectToggle(update) {
                const [valueId, value] = update
                const valueItem = getValueItem(valueId)

                if (valueItem && decode.isObjectType(valueItem.value))
                    decode.updateCollapsedValue(valueItem.value, value, storeNodeMap)
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
        }),
    )

    /**
     * Toggle the inspection of a value item (signal, prop, or owner value)
     */
    function inspectValueItem(item: Inspector.ValueItem, selected?: boolean): void {
        if (selected !== undefined && item.extended === selected) return
        selected = item.setExtended(p => selected ?? !p)
        bridge.output.InspectValue.emit({id: item.itemId, selected})
    }

    //
    // LOCATION
    //
    function openComponentLocation(): void {
        bridge.output.OpenLocation.emit()
    }

    return {
        inspected,
        inspectedNode,
        isSomeNodeInspected,
        isInspected,
        isInspectedTreeWalkerOwner,
        state,
        setInspectedNode,
        setInspectedOwner,
        toggleInspectedOwner,
        setInspectedSignal,
        inspectValueItem,
        openComponentLocation,
    }
}
