import { useController } from '@/controller'
import {
  DEFAULT_WALKER_MODE,
  DevtoolsMainView,
  Mapped,
  NodeID,
  NodeType,
  StructureUpdates,
  type TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { defer } from '@solid-devtools/shared/primitives'
import { createSimpleEmitter } from '@solid-primitives/event-bus'
import { entries } from '@solid-primitives/utils'
import { batch, createEffect, createMemo, createSelector, createSignal, untrack } from 'solid-js'

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

  // State to be stored in the controller cache
  export type Cache = { short: State; long: { mode: TreeWalkerMode } }

  export type Module = ReturnType<typeof createStructure>
}

export const { reconcileStructure } = (() => {
  let Updated: StructureUpdates['updated']
  let NewNodeList: Structure.Node[]

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

    NewNodeList.push(node)

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
    NewNodeList.push(node)
    node.level = level

    if (!raw) raw = Updated[rootId]?.[id]

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
        updateNode(child, rootId, Updated[rootId]?.[child.id], level + 1)
      }
    }

    return node
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function reconcileStructure(
    prevRoots: Structure.Node[],
    { removed, updated, partial }: StructureUpdates,
  ): Structure.State {
    Updated = updated
    NewNodeList = []
    const nextRoots: Structure.Node[] = []

    const upatedTopLevelRoots = new Set<NodeID>()
    for (const root of prevRoots) {
      const { id } = root
      // skip removed roots for partial updates
      // and for full updates skip roots that were not sent
      if (partial ? removed.includes(id) : !(id in Updated)) continue
      upatedTopLevelRoots.add(id)
      nextRoots.push(updateNode(root, id, Updated[id]?.[id], 0))
    }

    for (const [rootId, updatedNodes] of entries(Updated)) {
      const root = updatedNodes![rootId]!
      if (!root || upatedTopLevelRoots.has(rootId)) continue
      nextRoots.push(createNode(root, null, 0))
    }

    return { roots: nextRoots, nodeList: NewNodeList }
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

export function getNodePath(node: Structure.Node): Structure.Node[] {
  const path = [node]
  let parent = node.parent
  while (parent) {
    path.unshift(parent)
    parent = parent.parent
  }
  return path
}

export default function createStructure() {
  const ctx = useController()
  const { inspector } = ctx
  const { client, devtools } = ctx.controller
  const cachedInitialState = ctx.viewCache.get(DevtoolsMainView.Structure)

  const [mode, setMode] = createSignal<TreeWalkerMode>(
    cachedInitialState.long?.mode ?? DEFAULT_WALKER_MODE,
  )

  function changeTreeViewMode(newMode: TreeWalkerMode): void {
    if (newMode === mode()) return
    batch(() => {
      setMode(newMode)
      search('')
    })
  }

  const [state, setState] = createSignal<Structure.State>(
    cachedInitialState.short || { nodeList: [], roots: [] },
  )
  ctx.viewCache.set(DevtoolsMainView.Structure, () => ({
    short: state(),
    long: { mode: mode() },
  }))

  const inspectedNode = createMemo(() => {
    const id = inspector.inspected.ownerId
    return id ? findNode(id) : null
  })

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

  client.nodeUpdates.listen(updated => {
    updated.forEach(id => emitComputationUpdate(id))
  })

  const [searchResult, setSearchResult] = createSignal<NodeID[]>()
  const isSearched = createSelector(searchResult, (node: NodeID, o) => !!o && o.includes(node))

  function searchNodeList(query: string): NodeID[] | undefined {
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

  // SEARCH NODES
  let lastSearch: string = ''
  let lastSearchResults: NodeID[] | undefined
  let lastSearchIndex = 0
  function search(query: string): void {
    if (query === lastSearch) {
      if (lastSearchResults) {
        lastSearchIndex = (lastSearchIndex + 1) % lastSearchResults.length
        inspector.setInspectedOwner(lastSearchResults[lastSearchIndex]!)
      }
      return
    } else {
      lastSearch = query
      const result = searchNodeList(query)
      if (result) inspector.setInspectedOwner(result[(lastSearchIndex = 0)]!)
      lastSearchResults = result
    }
  }

  //
  // Listen to Client Events
  //
  client.on('resetPanel', () => {
    updateStructure(null)
  })

  client.on('structureUpdate', updateStructure)

  // TREE VIEW MODE
  createEffect(defer(mode, devtools.treeViewModeChange.emit))

  return {
    state,
    inspectedNode,
    updateStructure,
    isSearched,
    listenToComputationUpdate,
    findNode,
    getRootNode,
    getClosestComponentNode,
    getNodePath,
    search,
    changeTreeViewMode,
    mode,
    setMode,
  }
}
