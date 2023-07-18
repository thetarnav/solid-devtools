import { useController } from '@/controller'
import { DebuggerModule, DGraphUpdate, NodeID, NodeType } from '@solid-devtools/debugger/types'
import { createSignal, onCleanup } from 'solid-js'

export namespace Dgraph {
    export type Module = ReturnType<typeof createDependencyGraph>

    export type Cache = { short: {}; long: {} }
}

export function createDependencyGraph() {
    const { bridge, inspector } = useController()

    const [graph, setGraph] = createSignal<DGraphUpdate>(null)
    bridge.input.DgraphUpdate.listen(setGraph)

    bridge.output.ToggleModule.emit({ module: DebuggerModule.Dgraph, enabled: true })
    onCleanup(() =>
        bridge.output.ToggleModule.emit({ module: DebuggerModule.Dgraph, enabled: false }),
    )

    function inspectNode(id: NodeID) {
        const node = graph()?.[id]
        // eslint-disable-next-line no-console
        if (!node) return console.warn('inspectNode: node not found', id)

        if (node.type === NodeType.Signal) {
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
