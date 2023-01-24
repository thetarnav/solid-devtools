import { useController } from '@/controller'
import { DevtoolsMainView, DGraphUpdate } from '@solid-devtools/debugger/types'
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

  return {
    graph,
  }
}
