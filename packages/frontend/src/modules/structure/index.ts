import { Accessor, createSelector, createSignal, untrack } from 'solid-js'
import {
  defaultWalkerMode,
  NodeID,
  NodeType,
  RootsUpdates,
  type TreeWalkerMode,
} from '@solid-devtools/debugger/types'
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
  const [mode, setMode] = createSignal<TreeWalkerMode>(defaultWalkerMode)

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
    for (const node of state().nodeList) {
      if (node.id === id) return node
    }
  }

  const [listenToComputationUpdate, emitComputationUpdate] = createSimpleEmitter<NodeID>()

  const [extHovered, setHovered] = createSignal<NodeID | null>(null)
  const hovered = () => extHovered() || clientHoveredNodeId()

  const isHovered = createSelector<NodeID | null, NodeID>(hovered)

  function toggleHoveredNode(id: NodeID, hovered: boolean): NodeID | null {
    return setHovered(p => {
      if (hovered) return id
      return p && p === id ? null : p
    })
  }

  const [searchResult, setSearchResult] = createSignal<NodeID[]>()
  const isSearched = createSelector(searchResult, (node: NodeID, o) => !!o && o.includes(node))

  function search(query: string): NodeID[] | undefined {
    if (!query) return setSearchResult()
    return untrack(() => {
      const result: NodeID[] = []
      const rgx = new RegExp('^' + query, 'i')
      for (const node of state().nodeList) {
        if (node.name && node.name.match(rgx)) result.push(node.id)
      }
      return setSearchResult(result.length ? result : undefined)
    })
  }

  return {
    state,
    updateStructure,
    hovered,
    extHovered,
    isHovered: (node: NodeID) => isHovered(node) || isSearched(node),
    listenToComputationUpdate,
    emitComputationUpdate,
    toggleHoveredNode,
    findNode,
    getParentRoot,
    getNodePath,
    search,
    mode,
    setMode,
  }
}
