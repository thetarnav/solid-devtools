import {SidePanelCtx} from '@/SidePanel'
import {useController} from '@/controller'
import {Badge, Scrollable} from '@/ui'
import {NODE_TYPE_NAMES, NodeType, PropGetterState, ValueType} from '@solid-devtools/debugger/types'
import {Entries} from '@solid-primitives/keyed'
import {For, JSX, Show, batch, createMemo, useContext} from 'solid-js'
import {ValueNode} from './value-node'

function GroupTitle(props: {children: JSX.Element}) {
    return <h2 class="text-disabled mb-1 capitalize">{props.children}</h2>
}

function ListSignals<T>(props: {when: T; title: JSX.Element; children: JSX.Element}) {
    return (
        <Show when={props.when}>
            <div>
                <GroupTitle>{props.title}</GroupTitle>
                <ul>{props.children}</ul>
            </div>
        </Show>
    )
}

export function InspectorView(): JSX.Element {
    const {inspector, hovered} = useController()
    const {state} = inspector

    const {setOpenPanel} = useContext(SidePanelCtx)!

    const valueItems = createMemo(() => {
        const list = Object.values(state.signals)
        const memos: typeof list = []
        const signals: typeof list = []
        const stores: typeof list = []
        for (const signal of list) {
            if (signal.type === NodeType.Memo) memos.push(signal)
            else if (signal.type === NodeType.Signal) signals.push(signal)
            else if (signal.type === NodeType.Store) stores.push(signal)
        }
        return {memos, signals, stores}
    })

    return (
        <Scrollable>
            <div class="min-w-full w-fit p-4 p-b-14 flex flex-col gap-y-4">
                <ListSignals
                    when={state.props && Object.keys(state.props.record).length}
                    title={<>Props {state.props!.proxy && <Badge>PROXY</Badge>}</>}
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
                                isStale={value().getter === PropGetterState.Stale}
                            />
                        )}
                    </Entries>
                </ListSignals>
                <ListSignals when={valueItems().stores.length} title="Stores">
                    <For each={valueItems().stores}>
                        {store => (
                            <ValueNode
                                name={store.name}
                                value={store.value}
                                isExtended={store.extended}
                                onClick={() => inspector.inspectValueItem(store)}
                                onElementHover={hovered.toggleHoveredElement}
                            />
                        )}
                    </For>
                </ListSignals>
                <ListSignals when={valueItems().signals.length} title="Signals">
                    <For each={valueItems().signals}>
                        {signal => (
                            <ValueNode
                                name={signal.name}
                                value={signal.value}
                                onClick={() => inspector.inspectValueItem(signal)}
                                onElementHover={hovered.toggleHoveredElement}
                                isExtended={signal.extended}
                                isInspected={inspector.isInspected(signal.id)}
                                isSignal
                                actions={[
                                    {
                                        icon: 'Graph',
                                        title: 'Open in Graph panel',
                                        onClick() {
                                            batch(() => {
                                                inspector.setInspectedSignal(signal.id)
                                                setOpenPanel('dgraph')
                                            })
                                        },
                                    },
                                ]}
                            />
                        )}
                    </For>
                </ListSignals>
                <ListSignals when={valueItems().memos.length} title="Memos">
                    <For each={valueItems().memos}>
                        {memo => (
                            <ValueNode
                                name={memo.name}
                                value={memo.value}
                                isExtended={memo.extended}
                                onClick={() => inspector.inspectValueItem(memo)}
                                onElementHover={hovered.toggleHoveredElement}
                                isSignal
                                actions={[
                                    {
                                        icon: 'Graph',
                                        title: 'Open in Graph panel',
                                        onClick() {
                                            batch(() => {
                                                inspector.setInspectedOwner(memo.id)
                                                setOpenPanel('dgraph')
                                            })
                                        },
                                    },
                                ]}
                            />
                        )}
                    </For>
                </ListSignals>
                <Show when={state.value || state.location}>
                    <div>
                        <GroupTitle>
                            {state.type ? NODE_TYPE_NAMES[state.type] : 'Owner'}
                        </GroupTitle>
                        {state.value && (
                            <ValueNode
                                name="value"
                                value={state.value.value}
                                isExtended={state.value.extended}
                                // ts-eslint issue
                                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                                onClick={() => inspector.inspectValueItem(state.value!)}
                                onElementHover={hovered.toggleHoveredElement}
                                isSignal
                            />
                        )}
                        {state.location && (
                            <ValueNode
                                name="location"
                                value={{
                                    type: ValueType.String,
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
                </Show>
            </div>
        </Scrollable>
    )
}
