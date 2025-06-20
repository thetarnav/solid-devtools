import {misc} from '@nothing-but/utils'
import {parseLocationString} from '../locator/index.ts'
import {ObjectType, getSdtId} from '../main/id.ts'
import {observeValueUpdate, removeValueUpdateObserver} from '../main/observe.ts'
import setup from '../main/setup.ts'
import {type ElementInterface, type Mapped, type NodeID, type Solid, type SourceLocation, type ValueItemID, NodeType, ValueItemType} from '../main/types.ts'
import * as utils from '../main/utils.ts'
import {UNOWNED_ROOT} from '../main/roots.ts'
import {encodeValue} from './serialize.ts'
import {type InspectorUpdateMap, PropGetterState} from './types.ts'

export type Value_Node = {
    tracked_stores: (() => void)[]
    selected:       boolean
    get_value:      (() => unknown) | undefined
}

export function value_node_make(get_value: (() => unknown) | undefined): Value_Node {
    return {
        tracked_stores: [],
        selected:       false,
        get_value:      get_value,
    }
}

export function value_node_add_store_observer(node: Value_Node, unsub: () => void): void {
    node.tracked_stores.push(unsub)
}

function value_node_unsubscribe(node: Value_Node): void {
    for (let unsub of node.tracked_stores) unsub()
    node.tracked_stores = []
}

export function value_node_reset(node: Value_Node): void {
    value_node_unsubscribe(node)
    node.selected = false
}

export function value_node_is_selected(node: Value_Node): boolean {
    return node.selected
}

export function value_node_set_selected(node: Value_Node, selected: boolean): void {
    node.selected = selected
    if (!selected) value_node_unsubscribe(node)
}

export type Value_Node_Map = Map<ValueItemID, Value_Node>

export function value_node_map_make(): Value_Node_Map {
    return new Map()
}

export function value_node_map_get(map: Value_Node_Map, id: ValueItemID): Value_Node | undefined {
    return map.get(id)
}

export function value_node_map_add(map: Value_Node_Map, id: ValueItemID, get_value: (() => unknown) | undefined): void {
    map.set(id, value_node_make(get_value))
}

export function value_node_map_reset(map: Value_Node_Map): void {
    for (let signal of map.values()) value_node_reset(signal)
}

/** Prop becomes stale or live (is being currently listened to reactively or not) */
export type On_Prop_State_Change = (key: string, state: PropGetterState) => void
export type On_Value_Update = (id: ValueItemID) => void

export type Observed_Props_Map = WeakMap<Solid.Component['props'], Observed_Props>

const $NOT_SET = Symbol('not-set')

/**
 * Manages observing getter properties.
 * This is used to track when a prop is accessed and when it is no longer accessed. (STALE | LIVE)
 */
export type Observed_Props = {
    props:                 Solid.Component['props']
    on_prop_state_change?: On_Prop_State_Change | undefined
    on_value_update?:      On_Value_Update | undefined
    observed_getters:      Record<string, {v: unknown | typeof $NOT_SET; n: number}>
}

export function observed_props_make(props: Solid.Component['props']): Observed_Props {
    return {
        props:                props,
        on_prop_state_change: undefined,
        on_value_update:      undefined,
        observed_getters:     {} as Record<string, {v: unknown | typeof $NOT_SET; n: number}>
    }
}

export function observed_props_observe_prop(
    observed: Observed_Props,
    key: string,
    id: ValueItemID,
    get: () => unknown,
): {get_value: () => unknown | typeof $NOT_SET; is_stale: boolean} {
    if (observed.observed_getters[key]) {
        let o = observed.observed_getters[key]
        return {get_value: () => o.v, is_stale: o.n === 0}
    }

    let o: (typeof observed.observed_getters)[string] = (observed.observed_getters[key] = {
        v: $NOT_SET,
        n: 0,
    })

    // monkey patch the getter to track when it is accessed and when it is no longer accessed.
    // and to track when the value changes.
    Object.defineProperty(observed.props, key, {
        get() {
            let value = get()
            if (setup.solid.getListener()) {
                utils.onCleanup(
                    () => --o.n === 0 && observed.on_prop_state_change?.(key, PropGetterState.Stale),
                )
            }
            ++o.n === 1 && observed.on_prop_state_change?.(key, PropGetterState.Live)
            if (value !== o.v) observed.on_value_update?.(id)
            return (o.v = value)
        },
        enumerable: true,
    })

    return {get_value: () => o.v, is_stale: true}
}

function compare_proxy_prop_keys(
    old_keys: readonly string[],
    new_keys: readonly string[],
): InspectorUpdateMap['propKeys'] | null {
    let added = new Set(new_keys)
    let removed: string[] = []
    let changed = false
    for (let key of old_keys) {
        if (added.has(key)) added.delete(key)
        else {
            changed = true
            removed.push(key)
        }
    }
    if (!changed && !added.size) return null
    return {added: Array.from(added), removed}
}

/**
 * Clear all observers from inspected owner. (value updates, prop updates, etc.)
 * Used to clear observers when the inspected owner is switched.
 */
export function clear_owner_observers(owner: Solid.Owner, observed_props_map: Observed_Props_Map): void {
    if (utils.isSolidComputation(owner)) {
        removeValueUpdateObserver(owner, $INSPECTOR)

        if (utils.isSolidComponent(owner)) {
            let observed = observed_props_map.get(owner.props)
            if (observed) {
                observed.on_prop_state_change = undefined
                observed.on_value_update      = undefined
            }
        }
    }
    if (owner.sourceMap) for (let node of Object.values(owner.sourceMap)) {
        removeValueUpdateObserver(node, $INSPECTOR)
    }
    if (owner.owned) for (let node of owner.owned) {
        removeValueUpdateObserver(node, $INSPECTOR)
    }
}

type Inspector_Context<TEl extends object> = {
    value_map:            Value_Node_Map
    config:               Collect_Details_Config<TEl>
}

export
type Collect_Details_Config<TEl extends object> = {
    on_prop_state_change: On_Prop_State_Change
    on_value_update:      On_Value_Update
    props_map:            Observed_Props_Map
    eli:                  ElementInterface<TEl>
}

const $INSPECTOR = Symbol('inspector')

function map_source_value<TEl extends object>(
    node_raw: Solid.SourceMapValue | Solid.Computation,
    handler:  (nodeId: NodeID, value: unknown) => void,
    ctx:      Inspector_Context<TEl>,
): Mapped.SourceValue | null {

    let node = utils.getNode(node_raw)
    let {value} = node_raw
    let id: NodeID

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (node.kind) {
    case NodeType.Memo:        id = getSdtId(node.data, ObjectType.Owner)       ;break
    case NodeType.Signal:      id = getSdtId(node.data, ObjectType.Signal)      ;break
    case NodeType.Store:       id = getSdtId(node.data, ObjectType.Store)       ;break
    case NodeType.CustomValue: id = getSdtId(node.data, ObjectType.CustomValue) ;break
    default:
        return null
    }

    value_node_map_add(ctx.value_map, `${ValueItemType.Signal}:${id}`, () => node_raw.value)

    if (node.kind === NodeType.Memo ||
        node.kind === NodeType.Signal
    ) {
        observeValueUpdate(node.data, v => handler(id, v), $INSPECTOR)
    }

    return {
        type:  node.kind,
        name:  utils.getNodeName(node.data),
        id:    id,
        value: encodeValue(value, false, ctx.config.eli),
    }
}

/**
 * Pre-observe component props without gathering data.
 * To get fresh values when the component is later inspected.
 */
export function pre_observe_component_props(
    component: Solid.Component,
    props_map: Observed_Props_Map,
): void {
    let props = component.props

    // Only observe static shape props (not proxy props)
    if (utils.is_solid_proxy(props)) return

    let observed = props_map.get(props)
    if (!observed) props_map.set(props, (observed = observed_props_make(props)))

    // Set up getters for all props to enable tracking
    for (let [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
        if (desc.get) {
            let id: ValueItemID = `prop:${key}`
            observed_props_observe_prop(observed, key, id, desc.get)
        }
    }
}

function map_props<TEl extends object>(
    props: Solid.Component['props'],
    ctx:   Inspector_Context<TEl>,
) {
    // proxy props need to be checked for changes in keys
    let is_proxy = utils.is_solid_proxy(props)
    let check_proxy_props: (() => ReturnType<typeof compare_proxy_prop_keys>) | undefined

    let record: Mapped.Props['record'] = {}

    // PROXY PROPS
    if (is_proxy) {
        let keys = Object.keys(props)

        for (let key of keys) record[key] = {getter: PropGetterState.Stale, value: null}

        check_proxy_props = () => compare_proxy_prop_keys(keys, (keys = Object.keys(props)))
    }
    // STATIC SHAPE
    else {
        let observed = ctx.config.props_map.get(props)
        if (!observed) ctx.config.props_map.set(props, (observed = observed_props_make(props)))

        observed.on_prop_state_change = ctx.config.on_prop_state_change
        observed.on_value_update      = ctx.config.on_value_update

        for (let [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
            let id: ValueItemID = `prop:${key}`
            // GETTER
            if (desc.get) {
                let {get_value, is_stale} = observed_props_observe_prop(observed, key, id, desc.get)
                value_node_map_add(ctx.value_map, id, get_value)
                let last_value = get_value()
                record[key] = {
                    getter: is_stale ? PropGetterState.Stale : PropGetterState.Live,
                    value: last_value !== $NOT_SET ? encodeValue(get_value(), false, ctx.config.eli) : null,
                }
            }
            // VALUE
            else {
                record[key] = {
                    getter: false,
                    value: encodeValue(desc.value, false, ctx.config.eli),
                }
                // non-object props cannot be inspected (won't ever change and aren't deep)
                if (Array.isArray(desc.value) || misc.is_plain_object(desc.value))
                    value_node_map_add(ctx.value_map, id, () => desc.value)
            }
        }
    }

    return {props: {proxy: is_proxy, record}, check_proxy_props}
}

export function collect_owner_details<TEl extends object>(
    owner:  Solid.Owner,
    config: Collect_Details_Config<TEl>,
) {
    let ctx: Inspector_Context<TEl> = {
        value_map: value_node_map_make(),
        config:    config,
    }

    let id         = getSdtId(owner, ObjectType.Owner)
    let type       = utils.markOwnerType(owner)
    let owned      = owner.owned
    let source_map = owner.sourceMap
    let get_value  = () => owner.value

    let details = {id, name: utils.getNodeName(owner), type, signals: []} as Mapped.OwnerDetails

    // handle context node specially
    if (type === NodeType.Context) {

        source_map = undefined
        owned      = null

        /*
        since 1.8 context keys from parent are cloned to child context
        the last key should be the added value
        */
        let symbols = Object.getOwnPropertySymbols(owner.context)
        let context_value = owner.context[symbols[symbols.length - 1]!]
        get_value = () => context_value
    }

    let check_proxy_props: ReturnType<typeof map_props>['check_proxy_props']

    if (utils.isSolidComputation(owner)) {

        // handle Component (props and location)
        if (utils.isSolidComponent(owner)) {

            // marge component with refresh memo
            let refresh = utils.getComponentRefreshNode(owner)
            if (refresh) {

                source_map = refresh.sourceMap
                owned      = refresh.owned
                get_value  = () => refresh.value

                details.hmr = true
            }

            ;({check_proxy_props, props: details.props} = map_props(owner.props, ctx))

            let location: string | SourceLocation | undefined
            if ((
                (location = owner.sdtLocation) &&
                typeof location === 'string' &&
                (location = parseLocationString(location))
            ) || (
                (location = (owner.component as any).location) &&
                typeof location === 'string' &&
                (location = parseLocationString(location))
            )) {
                details.location = location
            }
        } else {
            observeValueUpdate(owner, () => ctx.config.on_value_update(ValueItemType.Value), $INSPECTOR)
        }

        details.value = encodeValue(get_value(), false, ctx.config.eli)
    }

    let on_signal_update = (signal_id: NodeID) =>
        ctx.config.on_value_update(`${ValueItemType.Signal}:${signal_id}`)

    // map signals
    if (source_map) for (let signal of source_map) {
        let mapped = map_source_value(signal, on_signal_update, ctx)
        if (mapped) details.signals.push(mapped)
    }

    // map memos
    if (owned) for (let node of owned) {
        let mapped = map_source_value(node, on_signal_update, ctx)
        if (mapped) details.signals.push(mapped)
    }

    /* Handle the fake unowned root */
    if (owner === UNOWNED_ROOT) {
        for (let signal_ref of setup.unowned.signals) {

            let signal = signal_ref.deref()
            if (signal == null) continue

            let mapped = map_source_value(signal, on_signal_update, ctx)
            if (mapped == null) continue

            details.signals.push(mapped)
        }
    }

    value_node_map_add(ctx.value_map, ValueItemType.Value, get_value)

    return {
        details:           details,
        value_map:         ctx.value_map,
        check_proxy_props: check_proxy_props,
    }
}
