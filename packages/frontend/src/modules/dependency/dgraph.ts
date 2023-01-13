export namespace Dgraph {
  export type Module = ReturnType<typeof createDependencyGraph>
}

export function createDependencyGraph() {
  return {}
}
