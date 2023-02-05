import { useController } from '@/controller'
import { DebuggerModule, DGraphUpdate, NodeID, NodeType } from '@solid-devtools/debugger/types'
import { createSignal, onCleanup } from 'solid-js'

export namespace Dgraph {
  export type Module = ReturnType<typeof createDependencyGraph>

  export type Cache = { short: {}; long: {} }
}

export function createDependencyGraph() {
  const ctx = useController()
  const { client, devtools } = ctx.controller

  const [graph, setGraph] = createSignal<DGraphUpdate>(null)
  client.dgraphUpdate.listen(setGraph)

  devtools.emit('toggleModule', { module: DebuggerModule.Dgraph, enabled: true })
  onCleanup(() => devtools.emit('toggleModule', { module: DebuggerModule.Dgraph, enabled: false }))

  function inspectNode(id: NodeID) {
    const node = graph()?.[id]
    // eslint-disable-next-line no-console
    if (!node) return console.warn('inspectNode: node not found', id)

    if (node.type === NodeType.Signal) {
      ctx.inspector.setInspectedNode(node.graph ?? null, id)
    } else {
      ctx.inspector.setInspectedOwner(id)
    }
  }

  return {
    graph,
    inspectNode,
  }
}
