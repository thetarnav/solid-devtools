import clsx from 'clsx'
import * as s from 'solid-js'
import {Entries} from '@solid-primitives/keyed'
import {createStaticStore} from '@solid-primitives/static-store'
import {defer, entries} from '@solid-primitives/utils'
import {createHover, createPingedSignal} from '@solid-devtools/shared/primitives'
import {error, splitOnColon} from '@solid-devtools/shared/utils'
import * as debug from '@solid-devtools/debugger/types'
import * as theme from '@solid-devtools/shared/theme'
import {SidePanelCtx} from './SidePanel.tsx'
import {useAppCtx, type InputEventBus, type OutputEventBus} from './controller.tsx'
import * as ui from './ui/index.ts'
import * as decode from './decode.ts'


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
        name:     string | null
        type:     debug.NodeType | null
        signals:  {[key: debug.NodeID]: Signal}
        value:    ValueItem | null
        props:    Props | null
        location: string | null
        hmr:      boolean
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
        newValue[property] = decode.decodeValue(newRawValue, newValue[property], storeNodeMap)
    }
    store.setValue(newValue)
}

const NULL_STATE = {
    name:     null,
    type:     null,
    location: null,
    props:    null,
    signals:  {},
    value:    null,
    hmr:      false,
} as const satisfies Inspector.State

const NULL_INSPECTED_NODE = {
    ownerId: null,
    signalId: null,
    treeWalkerOwnerId: null,
} as const satisfies debug.Debugger.InspectedState

export default function createInspector(
    output: OutputEventBus,
    input:  InputEventBus,
) {
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
    s.createEffect(defer(inspectedNode, node => {
        output.emit({name: 'InspectNode', details: node})
    }))

    //
    // Inspector state
    //

    const [state, setState] = createStaticStore<Inspector.State>({...NULL_STATE})

    const storeNodeMap = new decode.StoreNodeMap()

    function getValueItem(value_item_id: debug.ValueItemID): Inspector.ValueItem | undefined {

        const [type, id] = splitOnColon(value_item_id)

        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (type) {
        case debug.ValueItemType.Signal: return state.signals[id]
        case debug.ValueItemType.Prop:   return state.props?.record[id]
        case debug.ValueItemType.Value:  return state.value ?? undefined
        }
    }

    input.listen(e => {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (e.name) {
        case 'InspectedState': {
            let prev = inspected.ownerId
            setInspected(e.details)
            if (e.details.ownerId !== prev) setState({...NULL_STATE})
            break
        }
        case 'InspectedNodeDetails': {
            const raw = e.details
            const id = inspected.ownerId
            // The current inspected node is not the same as the one that sent the details
            // (replace it with the new one)
            if (!id || id !== raw.id) setInspectedOwner(raw.id)

            setState({
                name: raw.name,
                type: raw.type,
                hmr:  raw.hmr ?? false,
                location: raw.location?.file ?? null,
                signals: raw.signals.reduce(
                    (signals, s) => {
                        signals[s.id] = createSignalItem(
                            s.id,
                            s.type,
                            s.name,
                            decode.decodeValue(s.value, null, storeNodeMap))
                        return signals
                    },
                    {} as Inspector.State['signals'],
                ),
                value: raw.value
                    ? createValueItem(
                        debug.ValueItemType.Value,
                        decode.decodeValue(raw.value, null, storeNodeMap))
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
                                    p.getter)
                                return record
                            },
                            {} as Inspector.Props['record'],
                        ),
                    }
                    : null,
            })

            break
        }
        case 'InspectorUpdate': {
            const KIND = 0, DATA = 1

            for (let update of e.details) {
                switch (update[KIND]) {
                case 'value': {
                    let [value_item_id, value] = update[DATA]

                    let value_item = getValueItem(value_item_id)
                    if (value_item == null) {
                        error(`ValueItem not found for id ${value_item_id}.`)
                        break
                    }

                    value_item.setValue(decode.decodeValue(value, value_item.value, storeNodeMap))

                    break
                }
                case 'inspectToggle': {
                    let [value_item_id, value] = update[DATA]

                    let value_item = getValueItem(value_item_id)
                    if (value_item == null) {
                        error(`ValueItem not found for id ${value_item_id}.`)
                        break
                    }

                    if (decode.isObjectType(value_item.value)) {
                        decode.updateCollapsedValue(value_item.value, value, storeNodeMap)
                    }

                    break
                }
                case 'propKeys': {
                    setState('props', updateProxyProps(update[DATA]))
                    break
                }
                case 'propState': {
                    if (!state.props) break

                    for (const [key, getterState] of entries(update[DATA])) {
                        state.props.record[key]?.setGetter(getterState)
                    }

                    break
                }
                case 'store': {
                    updateStore(update[DATA], storeNodeMap)
                    break
                }
                }
            }

            break
        }
        }
    })

    /**
     * Toggle the inspection of a value item (signal, prop, or owner value)
     */
    function inspectValueItem(item: Inspector.ValueItem, selected?: boolean): void {
        if (selected !== undefined && item.extended === selected) return
        selected = item.setExtended(p => selected ?? !p)
        output.emit({
            name:    'InspectValue',
            details: {id: item.itemId, selected},
        })
    }

    //
    // LOCATION
    //
    function openComponentLocation(): void {
        output.emit({
            name:    'OpenLocation',
            details: undefined,
        })
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


function GroupTitle(props: {children: s.JSX.Element}) {
    return <h2 class="text-disabled mb-1 capitalize">{props.children}</h2>
}

function ListSignals<T>(props: {when: T; title: s.JSX.Element; children: s.JSX.Element}) {
    return (
        <s.Show when={props.when}>
            <div>
                <GroupTitle>{props.title}</GroupTitle>
                <ul>{props.children}</ul>
            </div>
        </s.Show>
    )
}

export function InspectorView(): s.JSX.Element {

    const {inspector, hovered} = useAppCtx()
    const {state} = inspector

    const {setOpenPanel} = s.useContext(SidePanelCtx)!

    const valueItems = s.createMemo(() => {
        const list = Object.values(state.signals)
        const memos:   Inspector.Signal[] = []
        const signals: Inspector.Signal[] = []
        const stores:  Inspector.Signal[] = []
        for (const signal of list) {
            switch (signal.type) {
            case debug.NodeType.Memo:   memos.push(signal)   ;break
            case debug.NodeType.Signal: signals.push(signal) ;break
            case debug.NodeType.Store:  stores.push(signal)  ;break
            }
        }
        return {memos, signals, stores}
    })

    return (
        <ui.Scrollable>
            <div class="min-w-full w-fit p-4 p-b-14 flex flex-col gap-y-4">
                <ListSignals
                    when={state.props && Object.keys(state.props.record).length}
                    title={<>Props {state.props!.proxy && <ui.Badge>PROXY</ui.Badge>}</>}
                >
                    <Entries of={state.props!.record}>
                    {(name, value) => (
                        <ValueNode
                            name={name}
                            value={value().value}
                            isExtended={value().extended}
                            onClick={() => inspector.inspectValueItem(value())}
                            onElementHover={hovered.toggleHoveredElement}
                            isSignal={value().getter !== false}
                            isStale={value().getter === debug.PropGetterState.Stale}
                        />
                    )}
                    </Entries>
                </ListSignals>
                <ListSignals when={valueItems().stores.length} title="Stores">
                    <s.For each={valueItems().stores}>
                    {store => (
                        <ValueNode
                            name={store.name}
                            value={store.value}
                            isExtended={store.extended}
                            onClick={() => inspector.inspectValueItem(store)}
                            onElementHover={hovered.toggleHoveredElement}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <ListSignals when={valueItems().signals.length} title="Signals">
                    <s.For each={valueItems().signals}>
                    {signal => (
                        <ValueNode
                            name={signal.name}
                            value={signal.value}
                            onClick={() => inspector.inspectValueItem(signal)}
                            onElementHover={hovered.toggleHoveredElement}
                            isExtended={signal.extended}
                            isInspected={inspector.isInspected(signal.id)}
                            isSignal
                            actions={[{
                                icon: 'Graph',
                                title: 'Open in Graph panel',
                                onClick() {
                                    s.batch(() => {
                                        inspector.setInspectedSignal(signal.id)
                                        setOpenPanel('dgraph')
                                    })
                                },
                            }]}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <ListSignals when={valueItems().memos.length} title="Memos">
                    <s.For each={valueItems().memos}>
                    {memo => (
                        <ValueNode
                            name={memo.name}
                            value={memo.value}
                            isExtended={memo.extended}
                            onClick={() => inspector.inspectValueItem(memo)}
                            onElementHover={hovered.toggleHoveredElement}
                            isSignal
                            actions={[{
                                icon: 'Graph',
                                title: 'Open in Graph panel',
                                onClick() {
                                    s.batch(() => {
                                        inspector.setInspectedOwner(memo.id)
                                        setOpenPanel('dgraph')
                                    })
                                },
                            }]}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <s.Show when={state.value || state.location}>
                    <div>
                        <GroupTitle>
                            {state.type ? debug.NODE_TYPE_NAMES[state.type] : 'Owner'}
                        </GroupTitle>
                        {state.value && (
                            <ValueNode
                                name           = "value"
                                value          = {state.value.value}
                                isExtended     = {state.value.extended}
                                onClick        = {() => inspector.inspectValueItem(state.value!)}
                                onElementHover = {hovered.toggleHoveredElement}
                                isSignal       = {
                                    state.type === debug.NodeType.Computation ||
                                    state.type === debug.NodeType.CatchError ||
                                    state.type === debug.NodeType.Effect ||
                                    state.type === debug.NodeType.Memo ||
                                    state.type === debug.NodeType.Refresh ||
                                    state.type === debug.NodeType.Render ||
                                    state.type === debug.NodeType.Signal ||
                                    state.type === debug.NodeType.Store ||
                                    state.hmr
                                }
                            />
                        )}
                        {state.location && (
                            <ValueNode
                                name="location"
                                value={{
                                    type: debug.ValueType.String,
                                    value: state.location,
                                }}
                                actions={[
                                    {
                                        icon: 'Code',
                                        title: 'Open component location',
                                        onClick: inspector.openComponentLocation,
                                    },
                                ]}
                            />
                        )}
                    </div>
                </s.Show>
            </div>
        </ui.Scrollable>
    )
}

const value_base = 'h-inspector_row font-500'
const value_nullable = value_base + ' color-disabled'
const value_function = value_base + ' font-italic'

type ToggleElementHover = (elementId: debug.NodeID, hovered?: boolean) => void

const ValueContext = s.createContext<{onElementHover?: ToggleElementHover; underStore: boolean}>()

const CollapsableObjectPreview: s.Component<{
    value: NonNullable<decode.ObjectValueData['value']>
}> = props => (
    <ul class="w-full flex flex-col gap-.5">
        <Entries of={props.value}>
            {(key, _value) => {
                const value = s.createMemo(_value)
                return (
                    <s.Show
                        when={decode.isValueNested(value())}
                        children={s.untrack(() => {
                            const [extended, setExtended] = s.createSignal(false)
                            return (
                                <ValueNode
                                    name={key}
                                    value={value()}
                                    onClick={() => setExtended(p => !p)}
                                    isExtended={extended()}
                                />
                            )
                        })}
                        fallback={<ValueNode name={key} value={value()} />}
                    />
                )
            }}
        </Entries>
    </ul>
)

const getObjectValueName = (type: debug.ValueType.Array | debug.ValueType.Object): string =>
    type === debug.ValueType.Array ? 'Array' : 'Object'

const ObjectValuePreview: s.Component<{
    type: debug.ValueType.Array | debug.ValueType.Object
    data: decode.ObjectValueData
    extended?: boolean
    label?: string
}> = props => {
    return (
        <s.Show
            when={props.data.value && props.data.length && props.extended}
            children={<CollapsableObjectPreview value={props.data.value!} />}
            fallback={
                <s.Show
                    when={props.data.length}
                    children={
                        <span class={value_base} aria-label={props.label}>
                            {getObjectValueName(props.type)} [{props.data.length}]
                        </span>
                    }
                    fallback={
                        <span class={value_nullable} aria-label={props.label}>
                            Empty {getObjectValueName(props.type)}
                        </span>
                    }
                />
            }
        />
    )
}

const string_value_class = 'string_value'
const string_value = clsx(
    string_value_class,
    value_base,
    'min-h-inspector_row h-fit max-w-fit text-green',
)

const value_element_container_class = 'value_element_container'
const value_element_container = clsx(
    value_element_container_class,
    ui.tag_brackets,
    value_base,
    ui.highlight_container,
    'text-dom',
)

export const value_node_styles = /*css*/ `
    .${string_value_class}:before, .${string_value_class}:after {
        content: '"';
        color: ${theme.vars.disabled};
    }

    .${value_element_container_class}:before {
        content: '<';
        color: ${theme.vars.disabled};
    }
    .${value_element_container_class}:after {
        content: '>';
        color: ${theme.vars.disabled};
    }
    .${value_element_container_class}:hover {
        ${ui.highlight_opacity_var}: 0.6;
    }
    /**/
`

const ValuePreview: s.Component<{
    value: decode.DecodedValue
    extended?: boolean
    label?: string
}> = props => {
    return s.createMemo(() => {
        const value = props.value
        switch (value.type) {
        case debug.ValueType.String:
            return (
                <span class={string_value} aria-label={props.label}>
                    {value.value}
                </span>
            )
        case debug.ValueType.Number:
            return (
                <span
                    class={value_base + ' min-h-inspector_row text-cyan-600'}
                    aria-label={props.label}
                >
                    {value.value}
                </span>
            )
        case debug.ValueType.Boolean:
            return (
                <input
                    type="checkbox"
                    class={value_base + ' pointer-events-none'}
                    onClick={e => e.preventDefault()}
                    checked={value.value}
                    aria-label={props.label}
                />
            )
        case debug.ValueType.Null:
            return (
                <span class={value_nullable} aria-label={props.label}>
                    {value.value === null ? 'null' : 'undefined'}
                </span>
            )
        case debug.ValueType.Unknown:
            return (
                <span class={value_nullable} aria-label={props.label}>
                    unknown
                </span>
            )
        case debug.ValueType.Function:
            return (
                <span class={value_function} aria-label={props.label}>
                    {value.name ? `f ${value.name}()` : 'function()'}
                </span>
            )
        case debug.ValueType.Getter:
            return (
                <span class={value_function} aria-label={props.label}>
                    get {value.name}()
                </span>
            )
        case debug.ValueType.Symbol:
            return (
                <span class={value_base} aria-label={props.label}>
                    Symbol({value.name})
                </span>
            )
        case debug.ValueType.Instance:
            return (
                <span class={value_base} aria-label={props.label}>
                    {value.name}
                </span>
            )
        case debug.ValueType.Element: {
            const ctx = s.useContext(ValueContext)!

            const hoverProps = createHover(hovered => {
                if (ctx.onElementHover) {
                    ctx.onElementHover(value.id, hovered)
                }
            })

            return (
                <span class={value_element_container} aria-label={props.label} {...hoverProps}>
                    <div class={ui.highlight_element} />
                    {value.name}
                </span>
            )
        }
        case debug.ValueType.Store:
            return (
                <ObjectValuePreview
                    type={value.valueType}
                    data={value}
                    extended={props.extended}
                    label={props.label}
                />
            )
        case debug.ValueType.Array:
        case debug.ValueType.Object:
            return (
                <ObjectValuePreview
                    type={value.type}
                    data={value}
                    extended={props.extended}
                    label={props.label}
                />
            )
        }
    }) as unknown as s.JSX.Element
}

type NestedHover = {
    isHovered: s.Accessor<boolean>
    hoverProps: s.JSX.HTMLAttributes<any>
}

function createNestedHover(): NestedHover {
    const [isHovered, setIsHovered] = s.createSignal(false)
    return {
        isHovered,
        hoverProps: {
            'on:pointerover': (e: PointerEvent) => {
                e.stopPropagation()
                setIsHovered(true)
            },
            'on:pointerout': (e: PointerEvent) => {
                e.stopPropagation()
                setIsHovered(false)
            },
        },
    }
}

export const ValueNode: s.Component<{
    value: decode.DecodedValue
    name: string | undefined
    /** signals can be inspected to be viewed in the dependency graph */
    isInspected?: boolean
    /** for nested values - is it collapsed or extended */
    isExtended?: boolean
    /** top-level, or inside a store (the value can change) */
    isSignal?: boolean
    /** for stale prop getters - their value is probably outdated */
    isStale?: boolean
    onClick?: VoidFunction
    onElementHover?: ToggleElementHover
    actions?: {icon: keyof typeof ui.Icon; title?: string; onClick: VoidFunction}[]
    class?: string
}> = props => {
    const ctx = s.useContext(ValueContext)

    const isUpdated =
        (props.isSignal || ctx?.underStore) &&
        (() => {
            const [_isUpdated, pingUpdated] = createPingedSignal()
            s.createEffect(defer(() => props.value, pingUpdated))
            return _isUpdated
        })()

    const handleSelect = (): void => {
        if (props.onClick && decode.isValueNested(props.value)) props.onClick()
    }

    const {isHovered, hoverProps} = createNestedHover()
    const isExtendable = s.createMemo(() => decode.isValueNested(props.value))

    return (
        <li
            class={clsx(
                props.class,
                ui.highlight_container,
                'flex flex-wrap items-start p-l-2ch',
                'font-mono leading-inspector_row',
                props.isStale && 'opacity-60',
            )}
            {...(props.name && {'aria-label': `${props.name} signal`})}
            {...hoverProps}
        >
            <div
                class={clsx(
                    'pointer-events-none absolute mt-.25 -inset-y-.25 -inset-x-1 b b-solid b-dom rounded',
                    props.isInspected ? 'opacity-50' : 'opacity-0',
                )}
                style={{'mask-image': 'linear-gradient(90deg, black, transparent)'}}
            />
            <div
                class={clsx(
                    ui.highlight_element,
                    'b b-solid b-highlight-border',
                    isHovered() ? 'opacity-30' : 'opacity-0',
                )}
            />

            {isExtendable() && (
                <div class="absolute -left-1 w-inspector_row h-inspector_row center-child">
                    <ui.CollapseToggle
                        onToggle={handleSelect}
                        class={clsx(
                            'transition-opacity',
                            (isExtendable() && props.isExtended) || isHovered()
                                ? 'opacity-100'
                                : 'opacity-0',
                        )}
                        collapsed={!props.isExtended}
                        default_collapsed
                        name={props.name}
                    />
                </div>
            )}

            {props.actions && (
                <div
                    class={clsx(
                        'absolute z-2 top-0 right-2 h-inspector_row',
                        'flex justify-end items-center',
                        'transition-opacity',
                        isHovered()
                            ? 'opacity-55 hover:opacity-80 active:opacity-100'
                            : 'opacity-0',
                    )}
                >
                    <s.For each={props.actions}>
                        {action => {
                            const IconComponent = ui.Icon[action.icon]
                            return (
                                <button
                                    onClick={action.onClick}
                                    class="center-child"
                                    title={action.title}
                                >
                                    <IconComponent class="h-4 w-4" />
                                </button>
                            )
                        }}
                    </s.For>
                </div>
            )}

            <div
                class={clsx('flex items-center', isExtendable() && 'cursor-pointer')}
                onClick={handleSelect}
            >
                <div
                    class={clsx(
                        'h-inspector_row min-w-5ch mr-2ch select-none font-mono',
                        props.isSignal || ctx?.underStore ? 'text-dom' : 'text-text-light',
                        'after:content-[":"] after:color-disabled',
                    )}
                >
                    <ui.Highlight highlight={isUpdated && isUpdated()} isSignal class="inline-block">
                        {props.name || debug.UNKNOWN}
                    </ui.Highlight>
                </div>
            </div>

            {/* provide context if one isn't already provided or if the value is a store
      (so that the ctx.underStore could be overwritten) */}
            <s.Show
                when={ctx && props.value.type !== debug.ValueType.Store}
                children={
                    <ValuePreview
                        value={props.value}
                        extended={props.isExtended}
                        label={props.name}
                    />
                }
                fallback={
                    <ValueContext.Provider
                        value={{
                            onElementHover: props.onElementHover || ctx?.onElementHover,
                            get underStore() {
                                return props.value.type === debug.ValueType.Store
                            },
                        }}
                    >
                        <ValuePreview
                            value={props.value}
                            extended={props.isExtended}
                            label={props.name}
                        />
                    </ValueContext.Provider>
                }
            />
        </li>
    )
}
