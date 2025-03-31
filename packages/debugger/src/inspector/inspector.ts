import {misc} from '@nothing-but/utils'
import {parseLocationString} from '../locator/index.ts'
import {ObjectType, getSdtId} from '../main/id.ts'
import {observeValueUpdate, removeValueUpdateObserver} from '../main/observe.ts'
import setup from '../main/setup.ts'
import {type Mapped, type NodeID, type Solid, type SourceLocation, type ValueItemID, NodeType, ValueItemType} from '../main/types.ts'
import * as utils from '../main/utils.ts'
import {UNOWNED_ROOT} from '../main/roots.ts'
import {encodeValue} from './serialize.ts'
import {type InspectorUpdateMap, PropGetterState} from './types.ts'

export class ValueNode {
    private trackedStores: VoidFunction[] = []
    private selected = false
    constructor(public getValue: (() => unknown) | undefined) {}
    addStoreObserver(unsub: VoidFunction) {
        this.trackedStores.push(unsub)
    }
    private unsubscribe() {
        for (const unsub of this.trackedStores) unsub()
        this.trackedStores = []
    }
    reset() {
        this.unsubscribe()
        this.selected = false
    }
    isSelected() {
        return this.selected
    }
    setSelected(selected: boolean) {
        this.selected = selected
        if (!selected) this.unsubscribe()
    }
}

export class ValueNodeMap {
    private record = {} as Record<ValueItemID, ValueNode>
    get(id: ValueItemID): ValueNode | undefined {
        return this.record[id]
    }
    add(id: ValueItemID, getValue: (() => unknown) | undefined) {
        this.record[id] = new ValueNode(getValue)
    }
    reset() {
        for (const signal of Object.values(this.record)) signal.reset()
    }
}

export namespace Inspector {
    /** Prop becomes stale or live (is being currently listened to reactively or not) */
    export type OnPropStateChange = (key: string, state: PropGetterState) => void
    export type OnValueUpdate = (id: ValueItemID) => void
}

export type ObservedPropsMap = WeakMap<Solid.Component['props'], ObservedProps>

const $NOT_SET = Symbol('not-set')

/**
 * Manages observing getter properties.
 * This is used to track when a prop is accessed and when it is no longer accessed. (STALE | LIVE)
 */
export class ObservedProps {
    constructor(readonly props: Solid.Component['props']) {}

    private onPropStateChange?: Inspector.OnPropStateChange | undefined
    private onValueUpdate?: Inspector.OnValueUpdate | undefined
    private observedGetters = {} as Record<string, {v: unknown | typeof $NOT_SET; n: number}>

    observe(
        onPropStateChange: Inspector.OnPropStateChange,
        onValueUpdate: Inspector.OnValueUpdate,
    ) {
        this.onPropStateChange = onPropStateChange
        this.onValueUpdate = onValueUpdate
    }
    unobserve() {
        this.onPropStateChange = undefined
        this.onValueUpdate = undefined
    }

    observeProp(
        key: string,
        id: ValueItemID,
        get: () => unknown,
    ): {getValue: () => unknown | typeof $NOT_SET; isStale: boolean} {
        if (this.observedGetters[key]) {
            const o = this.observedGetters[key]
            return {getValue: () => o.v, isStale: o.n === 0}
        }

        const self = this
        const o: (typeof this.observedGetters)[string] = (this.observedGetters[key] = {
            v: $NOT_SET,
            n: 0,
        })

        // monkey patch the getter to track when it is accessed and when it is no longer accessed.
        // and to track when the value changes.
        Object.defineProperty(this.props, key, {
            get() {
                const value = get()
                if (setup.solid.getListener()) {
                    utils.onCleanup(
                        () => --o.n === 0 && self.onPropStateChange?.(key, PropGetterState.Stale),
                    )
                }
                ++o.n === 1 && self.onPropStateChange?.(key, PropGetterState.Live)
                if (value !== o.v) self.onValueUpdate?.(id)
                return (o.v = value)
            },
            enumerable: true,
        })

        return {getValue: () => o.v, isStale: true}
    }
}

const compareProxyPropKeys = (
    oldKeys: readonly string[],
    newKeys: readonly string[],
): InspectorUpdateMap['propKeys'] | null => {
    const added = new Set(newKeys)
    const removed: string[] = []
    let changed = false
    for (const key of oldKeys) {
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
export function clearOwnerObservers(owner: Solid.Owner, observedPropsMap: ObservedPropsMap): void {
    if (utils.isSolidComputation(owner)) {
        removeValueUpdateObserver(owner, $INSPECTOR)

        if (utils.isSolidComponent(owner)) {
            observedPropsMap.get(owner.props)?.unobserve()
        }
    }
    if (owner.sourceMap) {
        for (const node of Object.values(owner.sourceMap))
            removeValueUpdateObserver(node, $INSPECTOR)
    }
    if (owner.owned) {
        for (const node of owner.owned) removeValueUpdateObserver(node, $INSPECTOR)
    }
}

// Globals set before collecting the owner details
let ValueMap!: ValueNodeMap
let OnValueUpdate: Inspector.OnValueUpdate
let OnPropStateChange: Inspector.OnPropStateChange
let PropsMap: ObservedPropsMap

const $INSPECTOR = Symbol('inspector')

function mapSourceValue(
    node_raw: Solid.SourceMapValue | Solid.Computation,
    handler:  (nodeId: NodeID, value: unknown) => void,
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

    ValueMap.add(`${ValueItemType.Signal}:${id}`, () => node_raw.value)

    if (node.kind === NodeType.Memo ||
        node.kind === NodeType.Signal
    ) {
        observeValueUpdate(node.data, v => handler(id, v), $INSPECTOR)
    }

    return {
        type:  node.kind,
        name:  utils.getNodeName(node.data),
        id:    id,
        value: encodeValue(value, false),
    }
}

function mapProps(props: Solid.Component['props']) {
    // proxy props need to be checked for changes in keys
    const isProxy = !!(props as any)[setup.solid.$PROXY]
    const record: Mapped.Props['record'] = {}

    let checkProxyProps: (() => ReturnType<typeof compareProxyPropKeys>) | undefined

    // PROXY PROPS
    if (isProxy) {
        let propsKeys = Object.keys(props)

        for (const key of propsKeys) record[key] = {getter: PropGetterState.Stale, value: null}

        checkProxyProps = () => {
            const _oldKeys = propsKeys
            return compareProxyPropKeys(_oldKeys, (propsKeys = Object.keys(props)))
        }
    }
    // STATIC SHAPE
    else {
        let observed = PropsMap.get(props)
        if (!observed) PropsMap.set(props, (observed = new ObservedProps(props)))

        observed.observe(OnPropStateChange, OnValueUpdate)

        for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
            const id: ValueItemID = `prop:${key}`
            // GETTER
            if (desc.get) {
                const {getValue, isStale} = observed.observeProp(key, id, desc.get)
                ValueMap.add(id, getValue)
                const lastValue = getValue()
                record[key] = {
                    getter: isStale ? PropGetterState.Stale : PropGetterState.Live,
                    value: lastValue !== $NOT_SET ? encodeValue(getValue(), false) : null,
                }
            }
            // VALUE
            else {
                record[key] = {
                    getter: false,
                    value: encodeValue(desc.value, false),
                }
                // non-object props cannot be inspected (won't ever change and aren't deep)
                if (Array.isArray(desc.value) || misc.is_plain_object(desc.value))
                    ValueMap.add(id, () => desc.value)
            }
        }
    }

    return {props: {proxy: isProxy, record}, checkProxyProps}
}

export type CollectDetailsConfig = {
    onPropStateChange: Inspector.OnPropStateChange
    onValueUpdate:     Inspector.OnValueUpdate
    observedPropsMap:  ObservedPropsMap
}

export function collectOwnerDetails(
    owner:  Solid.Owner,
    config: CollectDetailsConfig,
) {

    const {onValueUpdate} = config

    // Set globals
    ValueMap = new ValueNodeMap()
    OnValueUpdate = onValueUpdate
    OnPropStateChange = config.onPropStateChange
    PropsMap = config.observedPropsMap

    const id = getSdtId(owner, ObjectType.Owner)
    const type = utils.markOwnerType(owner)
    let {sourceMap, owned} = owner
    let getValue = () => owner.value

    const details = {id, name: utils.getNodeName(owner), type, signals: []} as Mapped.OwnerDetails

    // handle context node specially
    if (type === NodeType.Context) {
        sourceMap = undefined
        owned = null
        const symbols = Object.getOwnPropertySymbols(owner.context)
        /*
         since 1.8 context keys from parent are cloned to child context
         the last key should be the added value
        */
        const context_value = owner.context[symbols[symbols.length - 1]!]
        getValue = () => context_value
    }

    let checkProxyProps: ReturnType<typeof mapProps>['checkProxyProps']

    if (utils.isSolidComputation(owner)) {

        // handle Component (props and location)
        if (utils.isSolidComponent(owner)) {

            // marge component with refresh memo
            const refresh = utils.getComponentRefreshNode(owner)
            if (refresh) {

                sourceMap = refresh.sourceMap
                owned     = refresh.owned
                getValue  = () => refresh.value

                details.hmr = true
            }

            ;({checkProxyProps, props: details.props} = mapProps(owner.props))

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
            observeValueUpdate(owner, () => onValueUpdate(ValueItemType.Value), $INSPECTOR)
        }

        details.value = encodeValue(getValue(), false)
    }

    const onSignalUpdate = (signalId: NodeID) =>
        onValueUpdate(`${ValueItemType.Signal}:${signalId}`)

    // map signals
    if (sourceMap) for (let signal of sourceMap) {
        let mapped = mapSourceValue(signal, onSignalUpdate)
        if (mapped) details.signals.push(mapped)
    }

    // map memos
    if (owned) for (let node of owned) {
        let mapped = mapSourceValue(node, onSignalUpdate)
        if (mapped) details.signals.push(mapped)
    }

    /* Handle the fake unowned root */
    if (owner === UNOWNED_ROOT) {
        for (let signal_ref of setup.unowned.signals) {

            let signal = signal_ref.deref()
            if (signal == null) continue
    
            let mapped = mapSourceValue(signal, onSignalUpdate)
            if (mapped == null) continue
            
            details.signals.push(mapped)
        }
    }

    ValueMap.add(ValueItemType.Value, getValue)

    const result = {
        details,
        valueMap: ValueMap,
        checkProxyProps,
    }

    // clear globals
    ValueMap = OnValueUpdate = OnPropStateChange = PropsMap = undefined!

    return result
}
