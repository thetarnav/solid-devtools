import * as s from 'solid-js'
import {scheduleIdle, throttle} from '@solid-primitives/scheduled'
import {msg, warn} from '@solid-devtools/shared/utils'
import {ObjectType, getObjectById} from '../main/id.ts'
import {addSolidUpdateListener} from '../main/observe.ts'
import {type InspectedState, type Mapped, type NodeID, type OutputEmit, type Solid, type ValueItemID} from '../main/types.ts'
import {onOwnerDispose} from '../main/utils.ts'
import setup from '../main/setup.ts'
import {UNOWNED_ROOT} from '../main/roots.ts'
import * as inspector from './inspector.ts'
import {encodeValue} from './serialize.ts'
import * as store from './store.ts'
import {GLOBAL_GET_VALUE, type InspectorUpdate, type InspectorUpdateMap, PropGetterState} from './types.ts'

export * from './types.ts'

export type ToggleInspectedValueData = {id: ValueItemID; selected: boolean}

/**
 * Plugin module
 */
export function createInspector(props: {
    inspectedState:     s.Accessor<InspectedState>
    enabled:            s.Accessor<boolean>
    resetInspectedNode: VoidFunction
    emit:               OutputEmit
}) {

    let lastDetails: Mapped.OwnerDetails | undefined
    let inspectedOwner: Solid.Owner | null
    let valueMap: inspector.Value_Node_Map = new Map()
    const propsMap: inspector.Observed_Props_Map = new WeakMap()
    /** compare props object with the previous one to see whats changed */
    let checkProxyProps: (() => InspectorUpdateMap['propKeys'] | null) | null

    /*
     For the extension for inspecting values through `inspect()`
    */
    function getValue(id: ValueItemID): unknown {
        return valueMap.get(id)?.get_value?.()
    }
    window[GLOBAL_GET_VALUE] = getValue

    // Batch and dedupe inspector updates
    // these will include updates to signals, stores, props, and node value
    const {pushPropState, pushValueUpdate, pushInspectToggle, triggerPropsCheck, clearUpdates} =
        (() => {
            const valueUpdates = new Map<ValueItemID, boolean | null>()
            let storeUpdates: [storeProperty: store.StoreNodeProperty, data: store.StoreUpdateData][] = []
            let checkProps = false
            let propStates: InspectorUpdateMap['propState'] = {}

            const flush = scheduleIdle(() => {
                const batchedUpdates: InspectorUpdate[] = []

                // Value Nodes (signals, props, and owner value)
                for (const [id, toggleChange] of valueUpdates) {
                    const node = valueMap.get(id)
                    if (!node || !node.get_value) continue
                    // TODO shouldn't the previous stores be unsubscribed here? after update, they might no longer be here
                    const selected = inspector.value_node_is_selected(node)
                    const encoded = encodeValue(
                        node.get_value(),
                        selected,
                        setup.eli,
                        selected &&
                            (storeNode => inspector.value_node_add_store_observer(node, store.observeStoreNode(storeNode))),
                    )
                    batchedUpdates.push([
                        toggleChange === null ? 'value' : 'inspectToggle',
                        [id, encoded],
                    ])
                }
                valueUpdates.clear()

                // Stores
                for (const [storeProperty, data] of storeUpdates)
                    batchedUpdates.push([
                        'store',
                        [
                            storeProperty,
                            typeof data === 'object'
                                ? encodeValue(data.value, true, setup.eli, undefined, true)
                                : data ?? null,
                        ],
                    ])
                storeUpdates = []

                // Props (top-level key check of proxy props object)
                if (checkProps && checkProxyProps) {
                    const keys = checkProxyProps()
                    if (keys) batchedUpdates.push(['propKeys', keys])
                    checkProps = false
                }

                // Prop states (stale or not)
                if (Object.keys(propStates).length) {
                    batchedUpdates.push(['propState', propStates])
                    propStates = {}
                }

                // Emit updates
                if (batchedUpdates.length) {
                    props.emit(msg('InspectorUpdate', batchedUpdates))
                }
            })

            const flushPropsCheck = throttle(flush, 200)

            // Subscribe to any store updates
            // observed stores are managed by the store.ts module (only stores in selected values get observed)
            store.setOnStoreNodeUpdate((...payload) => {
                storeUpdates.push(payload)
                flush()
            })

            return {
                pushValueUpdate(id: ValueItemID) {
                    valueUpdates.set(id, null)
                    flush()
                },
                pushInspectToggle(id: ValueItemID, selected: boolean) {
                    const current = valueUpdates.get(id)
                    if (current === selected || current === null) return
                    else if (current === !selected) valueUpdates.delete(id)
                    else valueUpdates.set(id, selected)
                    flush()
                },
                triggerPropsCheck() {
                    checkProps = true
                    flushPropsCheck()
                },
                pushPropState(key: string, state: PropGetterState) {
                    propStates[key] = state
                    flush()
                },
                // since the updates are emitten on timeout, we need to make sure that
                // switching off the debugger or unselecting the owner will clear the updates
                clearUpdates() {
                    valueUpdates.clear()
                    storeUpdates = []
                    checkProps = false
                    flush.clear()
                    flushPropsCheck.clear()
                },
            }
        })()

    let clearPrevDisposeListener: VoidFunction | undefined



    function inspectOwnerId(id: NodeID | null): void {

        const owner = id && getObjectById(id, ObjectType.Owner)
        if (inspectedOwner) inspector.clear_owner_observers(inspectedOwner, propsMap)
        inspectedOwner = owner

        inspector.value_node_map_reset(valueMap)
        clearUpdates()

        if (owner) {
            const result = inspector.collect_owner_details(owner, {
                on_value_update:     pushValueUpdate,
                on_prop_state_change: pushPropState,
                props_map:  propsMap,
                eli:               setup.eli,
            })

            props.emit(msg('InspectedNodeDetails', result.details))

            valueMap        = result.value_map
            lastDetails     = result.details
            checkProxyProps = result.check_proxy_props || null
        } else {
            lastDetails     = undefined
            checkProxyProps = null
        }

        clearPrevDisposeListener?.()
        clearPrevDisposeListener = owner
            ? onOwnerDispose(owner, props.resetInspectedNode)
            : undefined
    }

    const inspectedOwnerId = s.createMemo(() => props.enabled()
        ? props.inspectedState().ownerId
        : null
    )
    s.createEffect(() => {
        let id = inspectedOwnerId()
        s.untrack(() => inspectOwnerId(id))
    })

    function onUnownedRootChange() {
        if (inspectedOwner === UNOWNED_ROOT) {
            inspectOwnerId(inspectedOwnerId())
        }
    }
    setup.unowned.onSignalAdded   = onUnownedRootChange
    setup.unowned.onSignalRemoved = onUnownedRootChange

    s.createEffect(() => {
        if (!props.enabled()) return

        // Check if proxy props have changed keys after each update queue
        s.onCleanup(addSolidUpdateListener(() => checkProxyProps && triggerPropsCheck()))
    })

    return {
        getLastDetails: () => lastDetails,
        toggleValueNode({id, selected}: ToggleInspectedValueData): void {
            const node = valueMap.get(id)
            if (!node) return warn('Could not find value node:', id)
            inspector.value_node_set_selected(node, selected)
            pushInspectToggle(id, selected)
        },
        consoleLogValue(value_id: ValueItemID): void {
            // eslint-disable-next-line no-console
            console.log(getValue(value_id))
        },
        preObserveComponent(component: Solid.Component): void {
            inspector.pre_observe_component_props(component, propsMap)
        }
    }
}
