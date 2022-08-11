import { batch, createEffect, createRoot, createSelector, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { HighlightContextState } from "@solid-devtools/ui"
import {
  GraphOwner,
  GraphSignal,
  GraphRoot,
  SerialisedTreeRoot,
  NodeID,
} from "@solid-devtools/shared/graph"
import { onRuntimeMessage, postRuntimeMessage } from "./bridge"
import {
  afterGraphUpdate,
  disposeAllNodes,
  findOwnerRootId,
  mapNewRoot,
  reconcileNode,
  removeRootFromMap,
} from "./reconcile"

const exports = createRoot(() => {
  const [graphs, setGraphs] = createStore<GraphRoot[]>([])

  const [updatedComputations, setUpdatedComputations] = createSignal<NodeID[]>([])

  let lastHoveredNode: null | GraphOwner | GraphSignal = null
  // const [highlightedObservers, setHighlightedObservers] = createSignal<GraphOwner[]>([])
  // const [highlightedSources, setHighlightedSources] = createSignal<GraphSignal[]>([])
  const [focused, setFocused] = createSignal<GraphOwner | null>(null)
  const ownerFocusedSelector = createSelector<GraphOwner | null, GraphOwner>(focused)

  const computationUpdatedSelector = createSelector(updatedComputations, (id, arr) =>
    arr.includes(id),
  )

  const highlights: HighlightContextState = {
    useComputationUpdatedSelector: id => computationUpdatedSelector.bind(void 0, id),
    handleFocus: setFocused,
    useOwnerFocusedSelector: owner => ownerFocusedSelector.bind(void 0, owner),
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

  onRuntimeMessage("GraphUpdate", ({ removed, updated }) => {
    batch(() => {
      setUpdatedComputations([])
      setGraphs(
        produce(proxy => {
          removed.forEach(id => removeRoot(proxy, id))
          updated.forEach(root => updateRoot(proxy, root))
        }),
      )
    })
    afterGraphUpdate()
  })

  onRuntimeMessage("ResetPanel", () => {
    batch(() => {
      setUpdatedComputations([])
      setGraphs([])
    })
    disposeAllNodes()
    afterGraphUpdate()
  })

  onRuntimeMessage("ComputationsUpdate", updates => {
    setUpdatedComputations(prev => {
      const copy = prev.slice()
      updates.forEach(({ rootId, nodeId }) => copy.push(nodeId))
      return [...new Set(copy)]
    })
  })

  let init = true
  createEffect(() => {
    const owner = focused()
    if (init) return (init = false)
    if (owner) {
      const rootId = findOwnerRootId(owner)
      postRuntimeMessage("SetFocusedOwner", { rootId, ownerId: owner.id })
    } else {
      postRuntimeMessage("SetFocusedOwner", null)
    }
  })

  return {
    graphs,
    highlights,
    focused,
  }
})
export const { graphs, highlights, focused } = exports
