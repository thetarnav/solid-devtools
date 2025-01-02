import clsx from 'clsx'
import * as s from 'solid-js'
import {Entries} from '@solid-primitives/keyed'
import {createStaticStore} from '@solid-primitives/static-store'
import {defer, entries, type FalsyValue} from '@solid-primitives/utils'
import {createHover, createPingedSignal} from '@solid-devtools/shared/primitives'
import {error, msg, splitOnColon} from '@solid-devtools/shared/utils'
import * as debug from '@solid-devtools/debugger/types'
import * as theme from '@solid-devtools/shared/theme'
import {SidePanelCtx} from './SidePanel.tsx'
import {useAppCtx, type InputEventBus, type OutputEventBus} from './controller.tsx'
import * as ui from './ui/index.ts'
import * as decode from './decode.ts'


export namespace Inspector {
    export type ValueItem = {
        itemId:      debug.ValueItemID
        extended:    s.Accessor<boolean>
        setExtended: s.Setter<boolean>
        value:       s.Accessor<decode.DecodedValue>
        setValue:    s.Setter<decode.DecodedValue>
    }

    export type Signal = {
        item:        ValueItem
        type:        debug.NodeType.Signal |
                     debug.NodeType.Memo |
                     debug.NodeType.Store |
                     debug.NodeType.CustomValue
        name:        string | undefined
        id:          debug.NodeID
    }

    export type Prop = {
        item:        ValueItem
        getter:      s.Accessor<debug.PropGetterState | false>
        setGetter:   s.Setter<debug.PropGetterState>
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
    const [extended, setExtended] = s.createSignal(false)
    const [value, setValue] = s.createSignal<decode.DecodedValue>(initValue)
    return {itemId, extended, setExtended, value, setValue}
}

function createPropItem(
    property: string,
    initValue: decode.DecodedValue,
    initGetterState: debug.PropGetterState | false,
): Inspector.Prop {
    const valueItem = createValueItem(`${debug.ValueItemType.Prop}:${property}`, initValue)
    const [getter, setGetter] = s.createSignal(initGetterState)
    return {
        item:      valueItem,
        getter:    getter,
        setGetter: setGetter as s.Setter<debug.PropGetterState>,
    }
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
} as const satisfies debug.InspectedState

export default function createInspector(
    output: OutputEventBus,
    input:  InputEventBus,
) {
    //
    // Inspected owner/signal
    //

    const [inspected, setInspected] =
        createStaticStore<debug.InspectedState>(NULL_INSPECTED_NODE)
    const inspectedNode = s.createMemo(() => ({...inspected}), void 0, {
        equals: (a, b) => a.ownerId === b.ownerId && a.signalId === b.signalId,
    })
    const isSomeNodeInspected = s.createMemo(
        () => inspected.ownerId !== null || inspected.signalId !== null,
    )
    const isInspected = s.createSelector<debug.InspectedState, debug.NodeID>(
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
        output.emit(msg('InspectNode', node))
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
        case debug.ValueItemType.Signal: return state.signals[id]?.item
        case debug.ValueItemType.Prop:   return state.props?.record[id]?.item
        case debug.ValueItemType.Value:  return state.value ?? undefined
        }
    }

    input.listen(e => {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (e.kind) {
        case 'InspectedState': {
            let prev = inspected.ownerId
            setInspected(e.data)
            if (e.data.ownerId !== prev) setState({...NULL_STATE})
            break
        }
        case 'InspectedNodeDetails': {
            const raw = e.data
            const id = inspected.ownerId
            // The current inspected node is not the same as the one that sent the details
            // (replace it with the new one)
            if (!id || id !== raw.id) setInspectedOwner(raw.id)

            let signals: Inspector.State['signals'] = {}
            for (let signal of raw.signals) {

                let item_id: debug.ValueItemID = `${debug.ValueItemType.Signal}:${signal.id}`
                let value = decode.decodeValue(signal.value, null, storeNodeMap)
                let item = createValueItem(item_id, value)

                signals[signal.id] = {
                    item: item,
                    id:   signal.id,
                    name: signal.name,
                    type: signal.type,
                }
            }

            setState({
                name: raw.name,
                type: raw.type,
                hmr:  raw.hmr ?? false,
                location: raw.location?.file ?? null,
                signals: signals,
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

            for (let update of e.data) {
                switch (update[KIND]) {
                case 'value': {
                    let [value_item_id, value] = update[DATA]

                    let value_item = getValueItem(value_item_id)
                    if (value_item == null) {
                        error(`ValueItem not found for id ${value_item_id}.`)
                        break
                    }

                    value_item.setValue(decode.decodeValue(value, value_item.value(), storeNodeMap))

                    break
                }
                case 'inspectToggle': {
                    let [value_item_id, value] = update[DATA]

                    let value_item = getValueItem(value_item_id)
                    if (value_item == null) {
                        error(`ValueItem not found for id ${value_item_id}.`)
                        break
                    }

                    let value_item_value = value_item.value()
                    if (decode.isObjectType(value_item_value)) {
                        decode.updateCollapsedValue(value_item_value, value, storeNodeMap)
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
        if (selected !== undefined && item.extended() === selected) return
        selected = item.setExtended(p => selected ?? !p)
        output.emit(msg('InspectValue', {id: item.itemId, selected}))
    }

    //
    // LOCATION
    //
    function openComponentLocation(): void {
        output.emit(msg('OpenLocation', undefined))
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

    const ctx = useAppCtx()

    const {setOpenPanel} = s.useContext(SidePanelCtx)!

    function getValueActionInspect(item: Inspector.ValueItem): ValueNodeAction | undefined {

        if (item.value().type !== debug.ValueType.Unknown) {
            return {
                icon:  'Eye',
                title: 'Inspect',
                onClick() {
                    ctx.output.emit(msg('ConsoleInspectValue', item.itemId))
                },
            }
        }
    }
    function getValueActionGraph(signal: Inspector.Signal): ValueNodeAction {
        return {
            icon:  'Graph',
            title: 'Open in Graph panel',
            onClick() {
                s.batch(() => {
                    ctx.inspector.setInspectedSignal(signal.id)
                    setOpenPanel('dgraph')
                })
            },
        }
    }

    const valueItems = s.createMemo(() => {
        let r = {
            custom_values: [] as Inspector.Signal[],
            signals:       [] as Inspector.Signal[],
            stores:        [] as Inspector.Signal[],
            memos:         [] as Inspector.Signal[],
        }
        for (let signal of Object.values(ctx.inspector.state.signals)) {
            switch (signal.type) {
            case debug.NodeType.CustomValue: r.custom_values.push(signal) ;break
            case debug.NodeType.Signal:      r.signals.push(signal)       ;break
            case debug.NodeType.Store:       r.stores.push(signal)        ;break
            case debug.NodeType.Memo:        r.memos.push(signal)         ;break
            }
        }
        return r
    })

    return (
        <ui.Scrollable>
            <div class="min-w-full w-fit p-4 p-b-14 flex flex-col gap-y-4">
                <ListSignals
                    when={
                        ctx.inspector.state.props != null &&
                        Object.keys(ctx.inspector.state.props.record).length
                    }
                    title={<>Props {ctx.inspector.state.props!.proxy && <ui.Badge>PROXY</ui.Badge>}</>}
                >
                    <Entries of={ctx.inspector.state.props!.record}>
                    {(name, value) => (
                        <ValueNode
                            name           = {name}
                            value          = {value().item.value()}
                            isExtended     = {value().item.extended()}
                            isSignal       = {value().getter() !== false}
                            isStale        = {value().getter() === debug.PropGetterState.Stale}
                            onElementHover = {ctx.hovered.toggleHoveredElement}
                            onClick        = {() => {
                                ctx.inspector.inspectValueItem(value().item)
                            }}
                            actions        = {[
                                getValueActionInspect(value().item),
                            ]}
                        />
                    )}
                    </Entries>
                </ListSignals>
                <ListSignals when={valueItems().custom_values.length} title="Custom Values">
                    <s.For each={valueItems().custom_values}>
                    {sig => (
                        <ValueNode
                            name           = {sig.name}
                            value          = {sig.item.value()}
                            isExtended     = {sig.item.extended()}
                            onElementHover = {ctx.hovered.toggleHoveredElement}
                            onClick        = {() => {
                                ctx.inspector.inspectValueItem(sig.item)
                            }}
                            actions        = {[
                                getValueActionInspect(sig.item),
                            ]}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <ListSignals when={valueItems().stores.length} title="Stores">
                    <s.For each={valueItems().stores}>
                    {store => (
                        <ValueNode
                            name           = {store.name}
                            value          = {store.item.value()}
                            isExtended     = {store.item.extended()}
                            onElementHover = {ctx.hovered.toggleHoveredElement}
                            onClick        = {() => {
                                ctx.inspector.inspectValueItem(store.item)
                            }}
                            actions        = {[
                                getValueActionInspect(store.item),
                            ]}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <ListSignals when={valueItems().signals.length} title="Signals">
                    <s.For each={valueItems().signals}>
                    {signal => (
                        <ValueNode
                            name           = {signal.name}
                            value          = {signal.item.value()}
                            isExtended     = {signal.item.extended()}
                            isInspected    = {ctx.inspector.isInspected(signal.id)}
                            isSignal
                            onElementHover = {ctx.hovered.toggleHoveredElement}
                            onClick        = {() => {
                                ctx.inspector.inspectValueItem(signal.item)
                            }}
                            actions        = {[
                                getValueActionInspect(signal.item),
                                getValueActionGraph(signal),
                            ]}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <ListSignals when={valueItems().memos.length} title="Memos">
                    <s.For each={valueItems().memos}>
                    {memo => (
                        <ValueNode
                            name           = {memo.name}
                            value          = {memo.item.value()}
                            isExtended     = {memo.item.extended()}
                            isSignal
                            onElementHover = {ctx.hovered.toggleHoveredElement}
                            onClick        = {() => {
                                ctx.inspector.inspectValueItem(memo.item)
                            }}
                            actions        = {[
                                getValueActionInspect(memo.item),
                                getValueActionGraph(memo),
                            ]}
                        />
                    )}
                    </s.For>
                </ListSignals>
                <s.Show when={
                    ctx.inspector.state.value ||
                    ctx.inspector.state.location
                }>
                    <div>
                        <GroupTitle>
                            {ctx.inspector.state.type
                                ? debug.NODE_TYPE_NAMES[ctx.inspector.state.type]
                                : 'Owner'}
                        </GroupTitle>
                        {ctx.inspector.state.value && (
                            <ValueNode
                                name           = "value"
                                value          = {ctx.inspector.state.value.value()}
                                isExtended     = {ctx.inspector.state.value.extended()}
                                onClick        = {() => {
                                    ctx.inspector.inspectValueItem(ctx.inspector.state.value!)
                                }}
                                onElementHover = {ctx.hovered.toggleHoveredElement}
                                isSignal       = {
                                    ctx.inspector.state.type === debug.NodeType.Computation ||
                                    ctx.inspector.state.type === debug.NodeType.CatchError ||
                                    ctx.inspector.state.type === debug.NodeType.Effect ||
                                    ctx.inspector.state.type === debug.NodeType.Memo ||
                                    ctx.inspector.state.type === debug.NodeType.Refresh ||
                                    ctx.inspector.state.type === debug.NodeType.Render ||
                                    ctx.inspector.state.type === debug.NodeType.Signal ||
                                    ctx.inspector.state.type === debug.NodeType.Store ||
                                    ctx.inspector.state.hmr
                                }
                                actions={[
                                    getValueActionInspect(ctx.inspector.state.value),
                                ]}
                            />
                        )}
                        {ctx.inspector.state.location && (
                            <ValueNode
                                name="location"
                                value={{
                                    type: debug.ValueType.String,
                                    value: ctx.inspector.state.location,
                                }}
                                actions={[
                                    {
                                        icon: 'Code',
                                        title: 'Open component location',
                                        onClick: ctx.inspector.openComponentLocation,
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
                        children={_ => {
                            const [extended, setExtended] = s.createSignal(false)
                            return (
                                <ValueNode
                                    name={key}
                                    value={value()}
                                    onClick={() => setExtended(p => !p)}
                                    isExtended={extended()}
                                />
                            )
                        }}
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
            when={
                props.data.value &&
                props.data.length &&
                props.extended
            }
            children={
                <CollapsableObjectPreview value={props.data.value!} />
            }
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

export type ValueNodeAction = {
    icon:    keyof typeof ui.icon;
    title?:  string;
    onClick: () => void
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
    actions?: (ValueNodeAction | FalsyValue)[]
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
            style={{
                [ui.highlight_opacity_var]: isHovered() ? '0.3' : '0',
            }}
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
                        'flex justify-end items-center gap-1',
                        'transition-opacity',
                        isHovered() ? 'opacity-100' : 'opacity-0',
                    )}
                >
                    <s.For each={props.actions.filter(Boolean)}>
                        {action => <>
                            <button
                                onClick={action.onClick}
                                class={clsx(
                                    'center-child',
                                    'opacity-55 hover:opacity-80 active:opacity-100',
                                )}
                                title={action.title}
                            >
                                <ui.Icon icon={action.icon} class="h-4 w-4" />
                            </button>
                        </>}
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
