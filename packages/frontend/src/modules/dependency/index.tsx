import { useController } from '@/controller'
import { Scrollable } from '@/ui'
import { DGraph, NodeID, NODE_TYPE_NAMES } from '@solid-devtools/debugger/types'
import { Key } from '@solid-primitives/keyed'
import { Component, createContext, createMemo, useContext } from 'solid-js'
import { createDependencyGraph, Dgraph } from './dgraph'

const DgraphContext = createContext<Dgraph.Module>()

export const useDgraph = () => {
  const ctx = useContext(DgraphContext)
  if (!ctx) throw new Error('Dgraph context not found')
  return ctx
}

const DgraphView: Component = () => {
  const ctx = useController()
  const dgraph = createDependencyGraph()

  type DisplayGraphNode = DGraph.Node & { id: NodeID }

  const list = createMemo<DisplayGraphNode[]>((p = []) => {
    const graph = dgraph.graph()
    if (!graph) return []

    const inspectedId = ctx.inspectedNodeId()
    if (!inspectedId) return p

    const inspectedNode = graph[inspectedId]
    if (!inspectedNode) return p

    if (!inspectedNode.observers && !inspectedNode.sources) return []

    const newList: DisplayGraphNode[] = [{ ...inspectedNode, id: inspectedId }]

    const checkedObservers = new Set<NodeID>([inspectedId])
    const checkedSources = new Set<NodeID>([inspectedId])

    // Breadth-first traversal
    // direct observers will be included closest to the inspected node
    // and further observers will be included further away

    // observers and sources are checked in parallel
    // by one list of ids per cycle
    // and the cycle is repeated until all ids are checked

    // so that the closer the node is to the inspected node in the d-graph
    // (no matter if it's an observer or a source)
    // the closer it will be to the inspected node in the list
    // and more likely to be on the correct side of the inspected node
    // (sources are added to the top of the list, observers to the bottom)
    const toCheck: [sources: (readonly NodeID[])[], observers: (readonly NodeID[])[]] = [
      inspectedNode.sources ? [inspectedNode.sources] : [],
      inspectedNode.observers ? [inspectedNode.observers] : [],
    ]
    let index = 0
    let checkingObservers: 0 | 1 = 0
    let ids = toCheck[checkingObservers][0]
    while (ids) {
      for (const id of ids) {
        const node = graph[id]
        if (!node) continue

        const inSources = checkedSources.has(id)
        const inObservers = checkedObservers.has(id)

        !inSources && node.sources && node.sources.length && toCheck[0].push(node.sources)
        !inObservers && node.observers && node.observers.length && toCheck[1].push(node.observers)

        inSources || inObservers || newList[checkingObservers ? 'push' : 'unshift']({ ...node, id })

        checkingObservers
          ? inObservers || checkedObservers.add(id)
          : inSources || checkedSources.add(id)
      }

      index += checkingObservers
      ids = toCheck[(checkingObservers = (checkingObservers ^ 1) as 0 | 1)][index]
      if (!ids) {
        index += checkingObservers
        ids = toCheck[(checkingObservers = (checkingObservers ^ 1) as 0 | 1)][index]
      }
    }

    return newList
  })

  return (
    <Scrollable>
      <DgraphContext.Provider value={dgraph}>
        <h3>List</h3>
        <Key each={list()} by="id">
          {node => (
            <div
              style={{
                padding: '0.5rem',
                color: ctx.isNodeInspected(node().id) ? 'red' : 'inherit',
              }}
            >
              {NODE_TYPE_NAMES[node().type]}: {node().name}
              <i>{node().id}</i>
            </div>
          )}
        </Key>
        <h3>Dependency Graph</h3>
        <pre>{JSON.stringify(dgraph.graph(), null, 2)}</pre>
      </DgraphContext.Provider>
    </Scrollable>
  )
}

export default DgraphView
