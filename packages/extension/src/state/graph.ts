import { batch, createRoot, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { NodeID, RootsUpdates, Mapped, Graph } from "@solid-devtools/shared/graph"
import { createUpdatedSelector } from "./utils"
import { createBoundSelector } from "@solid-devtools/shared/primitives"

const NodeMap: Record<NodeID, Record<NodeID, Graph.Owner>> = {}

function disposeOwner(owner: Graph.Owner): void {
  delete NodeMap[owner.id]
  owner.children.forEach(disposeOwner)
}

function disposeAllNodes(): void {
  for (const id in NodeMap) {
    delete NodeMap[id]
  }
}

// TODO: after graph virtualisation is implemented, rootId should precalculated for visible nodes
export function findOwnerRootId(owner: Graph.Owner): NodeID {
  for (const rootId in NodeMap) {
    const owners = NodeMap[rootId]
    for (const id in owners) {
      if (id === owner.id) return rootId
    }
  }
  throw "ROOT_ID_NOT_FOUND"
}

export function findOwnerById(rootId: NodeID, id: NodeID): Graph.Owner | undefined {
  return NodeMap[rootId][id]
}

// export function findOwnerByOwnerId(nodeId: NodeID): Graph.Owner | undefined {
//   for (const rootId in NodeMap) {
//     const node = Object.values(NodeMap[rootId]).find(owner => owner.id === nodeId)
//     if (node) return node
//   }
// }

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
function mapNewOwner(rootId: NodeID, owner: Readonly<Mapped.Owner>): Graph.Owner {
  const { id } = owner
  const node: Graph.Owner = {
    ...owner,
    children: owner.children.map(child => mapNewOwner(rootId, child)),
  }
  NodeMap[rootId][id] = node

  return node
}

function mapNewRoot(rootId: NodeID, owner: Readonly<Mapped.Owner>): Graph.Owner {
  NodeMap[rootId] = {}
  return mapNewOwner(rootId, owner)
}

/**
 * reconciles the existing reactive owner tree,
 * looking for changes and applying them granularely.
 */
function reconcileChildren(
  rootId: NodeID,
  newChildren: Mapped.Owner[],
  children: Graph.Owner[],
): void {
  const length = children.length,
    newLength = newChildren.length,
    childrenExtended = newLength > length

  let i = 0,
    limit = childrenExtended ? length : newLength,
    node: Graph.Owner,
    mapped: Mapped.Owner

  for (; i < limit; i++) {
    node = children[i]
    mapped = newChildren[i]
    if (node.id === mapped.id) reconcileNode(rootId, mapped, node)
    else {
      // dispose old, map new child
      disposeOwner(node)
      children[i] = mapNewOwner(rootId, mapped)
    }
  }

  if (childrenExtended) {
    for (; i < newLength; i++) {
      children[i] = mapNewOwner(rootId, newChildren[i])
    }
  } else {
    // dispose old
    children.splice(i).forEach(disposeOwner)
  }
}

function reconcileNode(rootId: NodeID, mapped: Mapped.Owner, node: Graph.Owner): void {
  reconcileChildren(rootId, mapped.children, node.children)
}

const exports = createRoot(() => {
  const [graphs, setGraphs] = createStore<Graph.Root[]>([])

  const [useComputationUpdatedSelector, addUpdatedComputations, clearUpdatedComputations] =
    createUpdatedSelector()

  const removeRoot = (proxy: Graph.Root[], id: NodeID): void => {
    const index = proxy.findIndex(e => e.id === id)
    proxy.splice(index, 1)
    delete NodeMap[id]
  }
  const updateRoot = (proxy: Graph.Root[], { id, tree }: Mapped.SRoot): void => {
    const root = proxy.find(r => r.id === id)
    // reconcile existing root
    if (root) reconcileNode(id, tree, root.tree)
    // insert new root
    else proxy.push({ id, tree: mapNewRoot(id, tree) })
  }

  function handleGraphUpdate({ removed, updated }: RootsUpdates) {
    batch(() => {
      clearUpdatedComputations()
      setGraphs(
        produce(proxy => {
          removed.forEach(id => removeRoot(proxy, id))
          updated.forEach(root => updateRoot(proxy, root))
        }),
      )
    })
  }

  function handleComputationsUpdate(nodeIds: NodeID[]) {
    addUpdatedComputations(nodeIds)
  }

  const NULL_HOVERED_STATE = { rootId: null, owner: null, sync: false } as const
  const [hovered, setHovered] = createSignal<
    Readonly<{ rootId: NodeID; owner: Graph.Owner; sync: boolean }> | typeof NULL_HOVERED_STATE
  >(NULL_HOVERED_STATE)

  const [useHoveredSelector] = createBoundSelector<NodeID | undefined, NodeID>(
    () => hovered().owner?.id,
  )

  /**
   * used in the owner ui node to toggle owner being hovered &
   * by the bridge to get the hovered component from the locator package
   * @param who owner or it's id
   * @param hovered `boolean`
   * @param sync should this change be synced to the bridge
   */
  function toggleHoveredOwner(who: Graph.Owner | NodeID, hovered: boolean, sync: boolean): void {
    setHovered(p => {
      if (typeof who === "string") {
        if (hovered) {
          for (const rootId in NodeMap) {
            const owner = Object.values(NodeMap[rootId]).find(owner => owner.id === who)
            if (owner) return { owner, rootId, sync }
          }
        } else if (p.owner && p.owner.id === who) return NULL_HOVERED_STATE
      } else {
        if (hovered) return { rootId: findOwnerRootId(who), owner: who, sync }
        // match ids because owner can be a proxy
        else if (p.owner && p.owner.id === who.id) return NULL_HOVERED_STATE
      }
      return p
    })
  }

  function resetGraph() {
    batch(() => {
      clearUpdatedComputations()
      setGraphs([])
      setHovered(NULL_HOVERED_STATE)
    })
    disposeAllNodes()
  }

  return {
    graphs,
    handleGraphUpdate,
    resetGraph,
    handleComputationsUpdate,
    useComputationUpdatedSelector,
    toggleHoveredOwner,
    useHoveredSelector,
    hovered,
  }
})
export const {
  graphs,
  handleGraphUpdate,
  resetGraph,
  handleComputationsUpdate,
  useComputationUpdatedSelector,
  toggleHoveredOwner,
  useHoveredSelector,
  hovered,
} = exports
