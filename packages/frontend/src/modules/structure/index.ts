import { Accessor, createSelector, createSignal, untrack } from 'solid-js'
import {
  defaultWalkerMode,
  Mapped,
  NodeID,
  NodeType,
  StructureUpdates,
  type TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { createSimpleEmitter } from '@solid-primitives/event-bus'

export namespace Structure {
  export interface Node {
    id: NodeID
    name?: string
    type: NodeType
    level: number
    parent: Node | null
    children: Node[]
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

const { reconcileStructure } = (() => {
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
    if (type === NodeType.Component) node.hmr = raw.hmr
    else if (type !== NodeType.Root && raw.frozen) node.frozen = true

    $_node_list.push(node)

    // map children
    if (rawChildren) {
      for (const child of rawChildren) children.push(createNode(child, node, level + 1))
    }

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

      if (rawChildren) {
        const prevChildrenMap: Record<NodeID, Structure.Node> = {}
        for (const child of children) prevChildrenMap[child.id] = child

        for (const childRaw of rawChildren) {
          const childNode = prevChildrenMap[childRaw.id] as Structure.Node | undefined
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
      const root = updatedNodes![rootId]
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
function getRootNode(node: Structure.Node): Structure.Node {
  let current: Structure.Node | null = node
  let lastRoot: Structure.Node | undefined
  while (current) {
    if (current.type === NodeType.Root) lastRoot = current
    current = current.parent
  }
  if (lastRoot) return lastRoot
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
    getRootNode,
    getNodePath,
    search,
    mode,
    setMode,
  }
}
