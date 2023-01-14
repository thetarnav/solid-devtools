import { useController } from '@/controller'
import { DevtoolsMainView } from '@solid-devtools/debugger/types'

export namespace Dgraph {
  export type Module = ReturnType<typeof createDependencyGraph>

  export type Cache = { short: {}; long: {} }
}

export function createDependencyGraph() {
  const ctx = useController()

  const state = {}
  ctx.viewCache.get(DevtoolsMainView.Dgraph)

  ctx.viewCache.set(DevtoolsMainView.Dgraph, () => ({ short: state, long: {} }))

  return {}
}
