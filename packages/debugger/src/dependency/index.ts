import { EmitterEmit, Listen } from '@solid-primitives/event-bus'
import { throttle } from '@solid-primitives/scheduled'
import { defer } from '@solid-primitives/utils'
import { Accessor, createEffect, createMemo } from 'solid-js'
import type { Debugger } from '../main'
import { DevtoolsMainView, NodeType } from '../main/constants'
import { ObjectType, getObjectById } from '../main/id'
import { NodeID, Solid } from '../main/types'
import { getNodeType } from '../main/utils'
import { OnNodeUpdate, SerializedDGraph, collectDependencyGraph } from './collect'

export { SerializedDGraph } from './collect'

export type DGraphUpdate = SerializedDGraph.Graph | null

export function createDependencyGraph(props: {
    emit: EmitterEmit<Debugger.OutputChannels>
    enabled: Accessor<boolean>
    inspectedState: Accessor<Debugger.InspectedState>
    listenToViewChange: Listen<DevtoolsMainView>
    onNodeUpdate: (nodeId: NodeID) => void
}) {
    let clearListeners: VoidFunction | null = null

    const onNodeUpdate: OnNodeUpdate = id => {
        // separate the callback from the computation
        queueMicrotask(() => {
            if (!props.enabled()) return
            props.onNodeUpdate(id)
            triggerInspect()
        })
    }

    const inspectedNode = createMemo(() => {
        const state = props.inspectedState()

        if (state.signalId) {
            return getObjectById(state.signalId, ObjectType.Signal)
        } else if (state.ownerId) {
            return getObjectById(state.ownerId, ObjectType.Owner)
        }

        return null
    })

    function inspectDGraph() {
        // listeners need to be cleared each time, because each update will cause the graph to be mapped again
        clearListeners?.()

        const node = inspectedNode()
        const type = node && getNodeType(node)

        if (
            !props.enabled() ||
            !type ||
            type === NodeType.Root ||
            type === NodeType.Component ||
            type === NodeType.Context
        ) {
            clearListeners = null
            props.emit('DgraphUpdate', null)
            return
        }

        const dgraph = collectDependencyGraph(node as Solid.Computation | Solid.Signal, {
            onNodeUpdate,
        })
        clearListeners = dgraph.clearListeners
        props.emit('DgraphUpdate', dgraph.graph)
    }
    const triggerInspect = throttle(inspectDGraph, 200)

    createEffect(
        defer([props.enabled, inspectedNode], () => {
            queueMicrotask(inspectDGraph)
        }),
    )

    props.listenToViewChange(() => {
        inspectDGraph()
    })
}
