import { Accessor, createMemo, createSelector, createSignal, untrack } from 'solid-js'
import { NodeID, NodeType, RootsUpdates } from '@solid-devtools/debugger/types'
import { reconcileStructure } from './structure-reconcile'
import { createSimpleEmitter } from '@solid-primitives/event-bus'

export namespace Structure {
  export interface Node {
    id: NodeID
    name?: string
    type: NodeType
    level: number
    parent: Node | null
    children: Node[]
    subroots?: Node[]
    hmr?: boolean
    frozen?: true
  }

  export interface Root extends Node {
    name?: undefined
    frozen?: undefined
    type: NodeType.Root
  }

  export type State = { roots: Node[]; nodeList: Node[] }
}

function getParentRoot(node: Structure.Node): Structure.Node {
  let current: Structure.Node | null = node
  while (current) {
    if (current.type === NodeType.Root) return current
    current = current.parent
  }
  throw new Error('Parent root not found')
}

function getNodePath(node: Structure.Node): Structure.Node[] {
  const path = [node]
  let parent = node.parent
  while (parent) {
    path.unshift(parent)
    parent = parent.parent
  }
  return path
}

export default function createStructure({
  clientHoveredNodeId,
}: {
  clientHoveredNodeId: Accessor<NodeID | null>
}) {
  const [state, setState] = createSignal<Structure.State>(
    { nodeList: [], roots: [] },
    { internal: true },
  )

  function updateStructure(update: RootsUpdates | null): void {
    setState(prev =>
      update
        ? reconcileStructure(prev.roots, update.updated, update.removed)
        : { nodeList: [], roots: [] },
    )
  }

  function findNode(id: NodeID): Structure.Node | undefined {
    for (const node of untrack(state).nodeList) {
      if (node.id === id) return node
    }
  }

  const [listenToComputationUpdate, emitComputationUpdate] = createSimpleEmitter<NodeID>()

  const [extHovered, setHovered] = createSignal<Structure.Node | null>(null)
  const clientHoveredComponent = createMemo(() => {
    const id = clientHoveredNodeId()
    return id ? findNode(id) : null
  })
  const hovered = () => extHovered() || clientHoveredComponent()

  const isHovered = createSelector(hovered, (id: NodeID, o) => !!o && o.id === id)

  function toggleHoveredNode(id: NodeID, hovered: boolean): Structure.Node | null {
    return setHovered(p => {
      if (hovered) return findNode(id) ?? p
      return p && p.id === id ? null : p
    })
  }

  return {
    state,
    updateStructure,
    hovered,
    extHovered,
    isHovered,
    listenToComputationUpdate,
    emitComputationUpdate,
    toggleHoveredNode,
    findNode,
    getParentRoot,
    getNodePath,
  }
}
