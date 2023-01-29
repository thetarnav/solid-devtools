import { useController } from '@/controller'
import { DevtoolsMainView, DGraphUpdate, NodeID, NodeType } from '@solid-devtools/debugger/types'
import { createSignal } from 'solid-js'

export namespace Dgraph {
  export type Module = ReturnType<typeof createDependencyGraph>

  export type Cache = { short: {}; long: {} }
}

export function createDependencyGraph() {
  const ctx = useController()
  const { client } = ctx.controller

  const [graph, setGraph] = createSignal<DGraphUpdate>(null)

  ctx.viewCache.get(DevtoolsMainView.Dgraph)
  ctx.viewCache.set(DevtoolsMainView.Dgraph, () => ({ short: {}, long: {} }))

  client.dgraphUpdate.listen(update => {
    setGraph(update)
  })

  function inspectNode(id: NodeID) {
    const node = graph()?.[id]
    // eslint-disable-next-line no-console
    if (!node) return console.warn('inspectNode: node not found', id)

    // TODO - handle signals
    if (node.type === NodeType.Signal) return

    ctx.setInspectedNode(id)
  }

  return {
    graph,
    inspectNode,
  }
}
