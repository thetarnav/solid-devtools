import {
  DEFAULT_WALKER_MODE,
  Mapped,
  NodeID,
  NodeType,
  StructureUpdates,
  type TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { createSimpleEmitter } from '@solid-primitives/event-bus'
import { Accessor, createSelector, createSignal, untrack } from 'solid-js'

export namespace Structure {
  export interface Node {
    id: NodeID
    name?: string
    type: NodeType
    level: number
    parent: Node | null
    children: Node[]
    hmr?: true
    frozen?: true
  }

  export interface Root extends Node {
    name?: undefined
    frozen?: undefined
    type: NodeType.Root
  }

  export type State = { roots: Node[]; nodeList: Node[] }
}

export const { reconcileStructure } = (() => {
  let $_updated: StructureUpdates['updated']
  let $_node_list: Structure.Node[]

  function createNode(
    raw: Mapped.Owner,
    parent: Structure.Node | null,
    level: number,
  ): Structure.Node {
    const { id, name, type, children: rawChildren } = raw

    const children: Structure.Node[] = []
    const node: Structure.Node = { id, type, children, parent, level }

    if (name) node.name = name
    if (type === NodeType.Component && raw.hmr) node.hmr = raw.hmr
    else if (type !== NodeType.Root && raw.frozen) node.frozen = true

    $_node_list.push(node)

    // map children
    for (const child of rawChildren) children.push(createNode(child, node, level + 1))

    return node
  }

  function updateNode(
    node: Structure.Node,
    rootId: NodeID,
    raw: Mapped.Owner | undefined,
    level: number,
  ): Structure.Node {
    const { id, children } = node
    $_node_list.push(node)
    node.level = level

    if (!raw) raw = $_updated[rootId]?.[id]

    if (raw) {
      // update frozen computations
      if ('frozen' in raw && raw.frozen) node.frozen = true

      const { children: rawChildren } = raw
      const newChildren: Structure.Node[] = (node.children = [])

      if (rawChildren.length) {
        const prevChildrenMap: Record<NodeID, Structure.Node> = {}
        for (const child of children) prevChildrenMap[child.id] = child

        for (const childRaw of rawChildren) {
          const childNode = prevChildrenMap[childRaw.id]
          newChildren.push(
            childNode
              ? updateNode(childNode, rootId, childRaw, level + 1)
              : createNode(childRaw, node, level + 1),
          )
        }
      }
    } else {
      for (const child of children) {
        updateNode(child, rootId, $_updated[rootId]?.[child.id], level + 1)
      }
    }

    return node
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function reconcileStructure(
    prevRoots: Structure.Node[],
    { removed, updated }: StructureUpdates,
  ): Structure.State {
    $_updated = updated
    $_node_list = []
    const nextRoots: Structure.Node[] = []

    const upatedTopLevelRoots = new Set<NodeID>()
    for (const root of prevRoots) {
      const { id } = root
      if (removed.includes(id)) continue
      upatedTopLevelRoots.add(id)
      nextRoots.push(updateNode(root, id, $_updated[id]?.[id], 0))
    }

    for (const [rootId, updatedNodes] of Object.entries($_updated)) {
      const root = updatedNodes![rootId]!
      if (!root || upatedTopLevelRoots.has(rootId)) continue
      nextRoots.push(createNode(root, null, 0))
    }

    return { roots: nextRoots, nodeList: $_node_list }
  }

  return { reconcileStructure }
})()

/**
 * Finds the top-root node
 */
export function getRootNode(node: Structure.Node): Structure.Node {
  let current: Structure.Node | null = node
  let lastRoot: Structure.Node | undefined
  while (current) {
    if (current.type === NodeType.Root) lastRoot = current
    current = current.parent
  }
  if (lastRoot) return lastRoot
  throw new Error('Parent root not found')
}

export function getClosestComponentNode(node: Structure.Node): Structure.Node | undefined {
  let current: Structure.Node | null = node
  while (current) {
    if (current.type === NodeType.Component) return current
    current = current.parent
  }
}

export function findClosestInspectableNode(node: Structure.Node): Structure.Node | undefined {
  let current: Structure.Node | null = node
  let lastRoot: Structure.Node | undefined
  while (current) {
    if (current.type === NodeType.Component || current.type === NodeType.Context) return current
    if (current.type === NodeType.Root) lastRoot = current
    current = current.parent
  }
  return lastRoot
}

export function getNodePath(node: Structure.Node): Structure.Node[] {
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
  const [mode, setMode] = createSignal<TreeWalkerMode>(DEFAULT_WALKER_MODE)

  const [state, setState] = createSignal<Structure.State>(
    { nodeList: [], roots: [] },
    { internal: true },
  )

  function updateStructure(update: StructureUpdates | null): void {
    setState(prev =>
      update ? reconcileStructure(prev.roots, update) : { nodeList: [], roots: [] },
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

  const isNodeHovered = createSelector<NodeID | null, NodeID>(hovered)

  function toggleHoveredNode(id: NodeID, isHovered: boolean): NodeID | null {
    return setHovered(p => {
      if (isHovered) return id
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
        if (node.type !== NodeType.Element && node.name && node.name.match(rgx))
          result.push(node.id)
      }
      return setSearchResult(result.length ? result : undefined)
    })
  }

  return {
    state,
    updateStructure,
    hovered,
    extHovered,
    isHovered: (node: NodeID) => isNodeHovered(node) || isSearched(node),
    listenToComputationUpdate,
    emitComputationUpdate,
    toggleHoveredNode,
    findNode,
    getRootNode,
    getClosestComponentNode,
    findClosestInspectableNode,
    getNodePath,
    search,
    mode,
    setMode,
  }
}
