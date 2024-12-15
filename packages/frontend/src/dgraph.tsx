import clsx from 'clsx'
import * as s from 'solid-js'
import * as debug from '@solid-devtools/debugger/types'
import {createHover} from '@solid-devtools/shared/primitives'
import * as theme from '@solid-devtools/shared/theme'
import {useController} from './controller.tsx'
import * as ui from './ui/index.ts'

export function createDependencyGraph() {
    const {bridge, inspector} = useController()

    const [graph, setGraph] = s.createSignal<debug.DGraphUpdate>(null)
    bridge.input.DgraphUpdate.listen(setGraph)

    bridge.output.ToggleModule.emit({module: debug.DebuggerModule.Dgraph, enabled: true})
    s.onCleanup(() =>
        bridge.output.ToggleModule.emit({module: debug.DebuggerModule.Dgraph, enabled: false}),
    )

    function inspectNode(id: debug.NodeID) {
        const node = graph()?.[id]
        // eslint-disable-next-line no-console
        if (!node) return console.warn('inspectNode: node not found', id)

        if (node.type === debug.NodeType.Signal) {
            inspector.setInspectedNode(node.graph ?? null, id)
        } else {
            inspector.setInspectedOwner(id)
        }
    }

    return {
        graph,
        inspectNode,
    }
}

type NodeOrder = {
    flowOrder: readonly debug.NodeID[]
    depthMap: Readonly<Record<debug.NodeID, number>>
}

function calculateNodeOrder(
    graph: debug.SerializedDGraph.Graph,
    inspectedId: debug.NodeID,
    inspectedNode: debug.SerializedDGraph.Node,
): NodeOrder {
    const depthGroups = new Map<number, debug.NodeID[]>([[inspectedNode.depth, [inspectedId]]])

    /*
        breadth-first traversal
        direct observers will be included closest to the inspected node
        and further observers will be included further away

        observers and sources are checked in parallel
        by one list of ids per cycle
        and the cycle is repeated until all ids are checked

        so that the closer the node is to the inspected node in the d-graph
        (no matter if it's an observer or a source)
        the closer it will be to the inspected node in the list
        and more likely to be on the correct side of the inspected node
        (sources are added to the top of the list, observers to the bottom)
    */

    const flowOrder = [inspectedId]
    const checkedObservers = new Set(flowOrder)
    const checkedSources = new Set(flowOrder)

    const toCheck: [sources: (readonly debug.NodeID[])[], observers: (readonly debug.NodeID[])[]] = [
        inspectedNode.sources ? [inspectedNode.sources] : [],
        inspectedNode.observers ? [inspectedNode.observers] : [],
    ]
    let index = 0
    let checkingObservers: 0 | 1 = 0
    let ids = toCheck[checkingObservers][0] ?? toCheck[(checkingObservers = 1)][index]
    while (ids) {
        for (const id of ids) {
            const node = graph[id]
            if (!node) continue

            const inSources   = checkedSources.has(id)
            const inObservers = checkedObservers.has(id)

            if (!inSources && node.sources && node.sources.length)
                toCheck[0].push(node.sources)
            if (!inObservers && node.observers && node.observers.length)
                toCheck[1].push(node.observers)

            if (!inSources && !inObservers) {
                flowOrder[checkingObservers ? 'push' : 'unshift'](id)
                const depthList = depthGroups.get(node.depth)
                if (depthList) depthList.push(id)
                else depthGroups.set(node.depth, [id])
            }

            checkingObservers
                ? inObservers || checkedObservers.add(id)
                : inSources   || checkedSources.add(id)
        }

        index += checkingObservers
        ids = toCheck[(checkingObservers = (checkingObservers ^ 1) as 0 | 1)][index]
        if (!ids) {
            index += checkingObservers
            ids = toCheck[(checkingObservers = (checkingObservers ^ 1) as 0 | 1)][index]
        }
    }

    // sort nodes by depth (horizontal alignment)
    const depthOrder = Array.from(depthGroups.entries()).sort(([a], [b]) => a - b)
    const depthMap: Record<debug.NodeID, number> = {}
    for (let i = 0; i < depthOrder.length; i++) {
        const ids = depthOrder[i]![1]
        for (const id of ids) depthMap[id] = i
    }

    return {flowOrder, depthMap}
}

const grid_size = theme.spacing[10]

const GraphNode: s.Component<{
    id: debug.NodeID
    depth: number
    node: debug.SerializedDGraph.Node
    isInspected: boolean
    onInspect: VoidFunction
    isHovered: boolean
    onHoverChange: (hovered: boolean) => void
    listenToUpdate(cb: VoidFunction): VoidFunction
}> = props => {
    const {name, type} = props.node
    const hoverProps = createHover(props.onHoverChange)

    const {pingUpdated, OwnerName} = ui.createHighlightedOwnerName()
    props.listenToUpdate(pingUpdated)

    const margin = theme.spacing[2]

    return (
        <div
            class={clsx(
                'group relative flex items-center',
                // inspected nodes are ont clickable
                props.isInspected ? 'cursor-default' : 'cursor-pointer',
            )}
            style={{
                height: `calc(${grid_size} - ${margin} * 2)`,
                'min-width': `calc(${grid_size} * 2)`,
                transform: `translateX(calc(${props.depth} * ${grid_size}))`,
                margin: margin,
                padding: `0 0.4rem`,
            }}
            onClick={props.onInspect}
            {...hoverProps}
        >
            <div
                class={clsx(
                    'absolute inset-0 opacity-80 b-2px b-solid rounded-md transition',
                    props.isHovered ? 'bg-panel-2' : 'bg-transparent group-hover:bg-panel-2',
                    props.isInspected ? 'b-panel-6' : 'b-transparent group-active:b-panel-4',
                )}
                style={{'box-shadow': `0 0 ${margin} ${theme.spacing[1]} ${theme.vars.panel[1]}`}}
            />
            <OwnerName name={name} type={type} />
        </div>
    )
}

function Line(props: {
    length: number
    depth: number
    source_depth: number
    flow_index: number
    source_flow_index: number
    node_margin: number
    highlighted: boolean
}): s.JSX.Element {
    const math = s.createMemo(() => {
        const l  = props.length
        const x1 = props.depth / l
        const x2 = props.source_depth / l
        const y1 = props.flow_index / l
        const y2 = props.source_flow_index / l
        const d  = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        return {x1, x2, y1, y2, d}
    })

    return (
        <line
            x1={math().x1}
            x2={math().x2}
            y1={math().y1}
            y2={math().y2}
            stroke-width={0.05 / props.length}
            stroke-dasharray={`${math().d - props.node_margin} 1`}
            stroke-dashoffset={props.node_margin / -2}
            marker-end="url(#head)"
            class={clsx(
                'stroke-dom stroke-cap-round transition-opacity duration-300 delay-75',
                props.highlighted ? 'opacity-100' : 'opacity-50',
            )}
        />
    )
}

export function Dgraph_View(): s.JSX.Element {
    const ctx = useController()
    const {inspector, hovered} = ctx
    const dgraph = createDependencyGraph()

    const order = s.createMemo<NodeOrder | null>((p = null) => {
        const graph = dgraph.graph()
        if (!graph) return null

        return s.untrack(() => {
            const inspectedId = inspector.inspected.signalId ?? inspector.inspected.ownerId
            if (!inspectedId) return p

            const inspectedNode = graph[inspectedId]
            if (!inspectedNode) return p

            return calculateNodeOrder(graph, inspectedId, inspectedNode)
        })
    })

    const thereIsAHoveredNode = s.createMemo(() => !!hovered.hoveredId())

    const pattern_size = '1px'
    const pattern = `${theme.vars.panel[2]} 0,
        ${theme.vars.panel[2]} ${pattern_size},
        transparent ${pattern_size},
        transparent ${grid_size}`

    return (
        <ui.Scrollable contentProps={{class: 'flex bg-panel-1'}}>
            <div
                class="relative min-h-full min-w-full flex flex-col items-start"
                style={{padding: `calc(${grid_size} - ${pattern_size})`}}
            >
                <div
                    class="absolute inset-0 opacity-70"
                    style={{
                        background:            `repeating-linear-gradient(${pattern}), repeating-linear-gradient(90deg, ${pattern})`,
                        'background-position': `-${pattern_size} -${pattern_size}`,
                    }}
                />
                <s.Show when={dgraph.graph() && order()}>{s.untrack(() => {
                    const flowOrder = (): readonly debug.NodeID[] => order()!.flowOrder
                    const depthMap  = (): Record<debug.NodeID, number> => order()!.depthMap
                    const length    = (): number => flowOrder().length
                    return <>
                        <s.For each={flowOrder()}>{id => (
                            <GraphNode
                                id={id}
                                depth={depthMap()[id]!}
                                node={dgraph.graph()![id]!}
                                isInspected={inspector.isInspected(id)}
                                onInspect={() => dgraph.inspectNode(id)}
                                isHovered={hovered.isNodeHovered(id)}
                                onHoverChange={state => hovered.toggleHoveredNode(id, 'node', state)}
                                listenToUpdate={listener => ctx.listenToNodeUpdate(id, listener)}
                            />
                        )}</s.For>
                        <svg
                            class="absolute overflow-visible pointer-events-none"
                            style={{
                                top:    `calc(${grid_size} * 1.5)`,
                                left:   `calc(${grid_size} * 1.5)`,
                                width:  `calc(${grid_size} * ${length()})`,
                                height: `calc(${grid_size} * ${length()})`,
                            }}
                            viewBox="0 0 1 1"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <marker
                                    id="head"
                                    orient="auto"
                                    refX="10"
                                    refY="2"
                                    class="overflow-visible"
                                >
                                    <path d="M0,0 L2.5,2 0,4" class="fill-none stroke-dom"/>
                                </marker>
                            </defs>
                            <s.For each={flowOrder()}>{(id, flowIndex) => (
                                <s.For each={dgraph.graph()![id]!.sources}>{sourceId => (
                                    <s.Show when={dgraph.graph()![sourceId]}>
                                        <Line
                                            length={length()}
                                            depth={depthMap()[id]!}
                                            source_depth={depthMap()[sourceId]!}
                                            flow_index={flowIndex()}
                                            source_flow_index={flowOrder().indexOf(sourceId)}
                                            node_margin={0.75 / length()}
                                            highlighted={
                                                // hovered node should take precedence over inspected node
                                                thereIsAHoveredNode()
                                                    ? hovered.isNodeHovered(id) || hovered.isNodeHovered(sourceId)
                                                    : inspector.isInspected(id) || inspector.isInspected(sourceId)
                                            }
                                        />
                                    </s.Show>
                                )}</s.For>
                            )}</s.For>
                        </svg>
                    </>
                })}</s.Show>
            </div>
        </ui.Scrollable>
    )
}
