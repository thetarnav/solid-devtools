import { batch, createRoot, onCleanup } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { HighlightContextState } from "@solid-devtools/ui"
import {
  GraphOwner,
  GraphSignal,
  GraphRoot,
  SerialisedTreeRoot,
  NodeID,
  MappedOwner,
  RootsUpdates,
} from "@solid-devtools/shared/graph"
import { createUpdatedSelector, deleteKey, disposeAll } from "./utils"
import { setFocused, useOwnerFocusedSelector } from "./details"

const NodeMap: Record<NodeID, Record<NodeID, GraphOwner>> = {}

// TODO: map source/observers length separately, as these won't always resolve
let observersToAddLazy: Record<NodeID, ((source: GraphOwner) => void)[]> = {}

export function disposeAllNodes() {
  for (const { owners, signals } of Object.values(NodeMap)) {
    disposeAll(Object.values(owners))
    disposeAll(Object.values(signals))
  }
}

export function removeRootFromMap(id: NodeID) {
  delete NodeMap[id]
}

export function afterGraphUpdate() {
  // sources and observers can be added lazily only during one reconciliation
  observersToAddLazy = {}
}

export function findOwnerRootId(owner: GraphOwner): NodeID {
  for (const rootId in NodeMap) {
    const owners = NodeMap[rootId]
    for (const id in owners) {
      if (id === owner.id + "") return rootId
    }
  }
  throw "ROOT_ID_NOT_FOUND"
}

export function findOwnerById(rootId: NodeID, id: NodeID): GraphOwner | undefined {
  return NodeMap[rootId][id]
}

const addOwnerToMap = (rootId: NodeID, node: GraphOwner) => {
  const id = node.id
  const owners = NodeMap[rootId]
  owners[id] = node
  onCleanup(deleteKey.bind(owners, id))
  const toAdd = observersToAddLazy[id]
  if (toAdd) {
    toAdd.forEach(f => f(node))
    delete observersToAddLazy[id]
  }
}

// function mapObserver(rootId: NodeID, id: NodeID, mutable: GraphOwner[]) {
//   const node = NodeMap[rootId][id]
//   if (node) mutable.push(node)
//   else pushToArrayProp(observersToAddLazy, id, owner => mutable.push(owner))
// }

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
export function mapNewOwner(rootId: NodeID, owner: Readonly<MappedOwner>): GraphOwner {
  // wrap with root that will be disposed together with the rest of the tree
  // TODO do we need disposing?
  return createRoot(dispose => {
    const children: GraphOwner[] = []
    const node: GraphOwner = { ...owner, children, dispose }
    addOwnerToMap(rootId, node)

    // TODO: remove mapping signals
    // node.signals.push(...owner.signals.map(createSignalNode))
    node.children.push(...owner.children.map(child => mapNewOwner(rootId, child)))
    // if (owner.signal) node.signal = createSignalNode(rootId, owner.signal)

    onCleanup(disposeAll.bind(void 0, node.children))
    // onCleanup(disposeAll.bind(void 0, node.signals))

    return node
  })
}

export function mapNewRoot(rootId: NodeID, owner: Readonly<MappedOwner>): GraphOwner {
  NodeMap[rootId] = {}
  return mapNewOwner(rootId, owner)
}

/**
 * reconciles the existing reactive owner tree,
 * looking for changes and applying them granularely.
 */
function reconcileChildren(
  rootId: NodeID,
  newChildren: MappedOwner[],
  children: GraphOwner[],
): void {
  const length = children.length,
    newLength = newChildren.length,
    childrenExtended = newLength > length

  let i = 0,
    limit = childrenExtended ? length : newLength,
    node: GraphOwner,
    mapped: MappedOwner

  for (; i < limit; i++) {
    node = children[i]
    mapped = newChildren[i]
    if (node.id === mapped.id) reconcileNode(rootId, mapped, node)
    else {
      // dispose old, map new child
      node.dispose()
      children[i] = mapNewOwner(rootId, mapped)
    }
  }

  if (childrenExtended) {
    for (; i < newLength; i++) {
      // dispose old, map new child
      children[i]?.dispose()
      children[i] = mapNewOwner(rootId, newChildren[i])
    }
  } else {
    // dispose old
    disposeAll(children.splice(i))
  }
}

export function reconcileNode(rootId: NodeID, mapped: MappedOwner, node: GraphOwner): void {
  reconcileChildren(rootId, mapped.children, node.children)
}

const exports = createRoot(() => {
  const [graphs, setGraphs] = createStore<GraphRoot[]>([])

  const [useComputationUpdatedSelector, addUpdatedComputations, clearUpdatedComputations] =
    createUpdatedSelector()

  let lastHoveredNode: null | GraphOwner | GraphSignal = null
  // const [highlightedObservers, setHighlightedObservers] = createSignal<GraphOwner[]>([])
  // const [highlightedSources, setHighlightedSources] = createSignal<GraphSignal[]>([])

  const highlights: HighlightContextState = {
    useComputationUpdatedSelector,
    handleFocus: setFocused,
    useOwnerFocusedSelector,
    highlightSignalObservers(signal, highlight) {
      // TODO
      // if (highlight) {
      //   setHighlightedObservers(signal.observers)
      //   lastHoveredNode = signal
      // } else if (lastHoveredNode === signal) {
      //   setHighlightedObservers([])
      // }
    },
    highlightNodeSources(owner, highlight) {
      // TODO
      // if (highlight) {
      //   setHighlightedSources(owner.sources)
      //   lastHoveredNode = owner
      // } else if (lastHoveredNode === owner) {
      //   setHighlightedSources([])
      // }
    },
    // isObserverHighlighted: createSelector(highlightedObservers, (owner: GraphOwner, list) =>
    //   list.includes(owner),
    // ),
    isObserverHighlighted: () => false,
    isSourceHighlighted: () => false,
    // isSourceHighlighted: createSelector(highlightedSources, (signal: GraphSignal, list) =>
    //   list.includes(signal),
    // ),
  }

  const removeRoot = (proxy: GraphRoot[], id: NodeID): void => {
    proxy.splice(
      proxy.findIndex(e => e.id === id),
      1,
    )
    removeRootFromMap(id)
  }
  const updateRoot = (proxy: GraphRoot[], { id, tree }: SerialisedTreeRoot): void => {
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
    afterGraphUpdate()
  }

  function handleComputationsUpdate(nodeIds: NodeID[]) {
    addUpdatedComputations(nodeIds)
  }

  function resetGraph() {
    batch(() => {
      clearUpdatedComputations()
      setGraphs([])
    })
    disposeAllNodes()
    afterGraphUpdate()
  }

  return { graphs, highlights, handleGraphUpdate, resetGraph, handleComputationsUpdate }
})
export const { graphs, highlights, handleGraphUpdate, resetGraph, handleComputationsUpdate } =
  exports
