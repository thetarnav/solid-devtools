import * as s from 'solid-js'
import {throttle} from '@solid-primitives/scheduled'
import {defer} from '@solid-primitives/utils'
import {msg} from '@solid-devtools/shared/utils'
import {ObjectType, getObjectById} from '../main/id.ts'
import {DevtoolsMainView, NodeType, type InspectedState, type NodeID, type OutputEmit, type Solid} from '../main/types.ts'
import {getNodeType} from '../main/utils.ts'
import {type OnNodeUpdate, type SerializedDGraph, collectDependencyGraph} from './collect.ts'

export {type SerializedDGraph} from './collect.ts'

export type DGraphUpdate = SerializedDGraph.Graph | null

export function createDependencyGraph(props: {
    enabled:        s.Accessor<boolean>
    inspectedState: s.Accessor<InspectedState>
    onNodeUpdate:   (nodeId: NodeID) => void
    emit:           OutputEmit
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

    const inspectedNode = s.createMemo(() => {
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
            props.emit(msg('DgraphUpdate', null))
            return
        }

        const dgraph = collectDependencyGraph(node as Solid.Computation | Solid.Signal, {
            onNodeUpdate,
        })
        clearListeners = dgraph.clearListeners
        props.emit(msg('DgraphUpdate', dgraph.graph))
    }
    const triggerInspect = throttle(inspectDGraph, 200)

    s.createEffect(
        defer([props.enabled, inspectedNode], () => {
            queueMicrotask(inspectDGraph)
        }),
    )

    return {
        onViewChange(_: DevtoolsMainView) {
            inspectDGraph()
        }
    }
}
