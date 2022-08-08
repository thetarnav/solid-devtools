import { batch, createEffect, createRoot, createSelector, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { HighlightContextState } from "@solid-devtools/ui"
import { UpdateType } from "@solid-devtools/shared/bridge"
import {
  GraphOwner,
  GraphSignal,
  GraphRoot,
  SerialisedTreeRoot,
} from "@solid-devtools/shared/graph"
import { onRuntimeMessage, postRuntimeMessage } from "./bridge"
import {
  afterGraphUpdate,
  disposeAllNodes,
  findOwnerRootId,
  mapNewOwner,
  mapNewRoot,
  reconcileNode,
  resetComputationRerun,
  updateComputation,
  updateSignal,
} from "./reconcile"

const exports = createRoot(() => {
  const [graphs, setGraphs] = createStore<GraphRoot[]>([])

  let lastHoveredNode: null | GraphOwner | GraphSignal = null
  const [highlightedObservers, setHighlightedObservers] = createSignal<GraphOwner[]>([])
  const [highlightedSources, setHighlightedSources] = createSignal<GraphSignal[]>([])
  const [focused, setFocused] = createSignal<GraphOwner | null>(null)
  const isFocused = createSelector<GraphOwner | null, GraphOwner>(focused)

  const highlights: HighlightContextState = {
    highlightSignalObservers(signal, highlight) {
      if (highlight) {
        setHighlightedObservers(signal.observers)
        lastHoveredNode = signal
      } else if (lastHoveredNode === signal) {
        setHighlightedObservers([])
      }
    },
    highlightNodeSources(owner, highlight) {
      if (highlight) {
        setHighlightedSources(owner.sources)
        lastHoveredNode = owner
      } else if (lastHoveredNode === owner) {
        setHighlightedSources([])
      }
    },
    isObserverHighlighted: createSelector(highlightedObservers, (owner: GraphOwner, list) =>
      list.includes(owner),
    ),
    isSourceHighlighted: createSelector(highlightedSources, (signal: GraphSignal, list) =>
      list.includes(signal),
    ),
    handleFocus: setFocused,
    isOwnerFocused: isFocused,
  }

  const addNewRoot = (proxy: GraphRoot[], { id, tree }: SerialisedTreeRoot): void => {
    proxy.push({ id, tree: mapNewRoot(id, tree) })
  }
  const removeRoot = (proxy: GraphRoot[], id: number): void => {
    proxy.splice(
      proxy.findIndex(e => e.id === id),
      1,
    )
  }
  const updateRoot = (proxy: GraphRoot[], { id, tree }: SerialisedTreeRoot): void => {
    const index = graphs.findIndex(r => r.id === id)
    // reconcile existing root
    if (index !== -1) reconcileNode(id, tree, proxy[index].tree)
    // insert new root
    else addNewRoot(proxy, { id, tree })
  }

  onRuntimeMessage("GraphUpdate", ({ added, removed, updated }) => {
    batch(() => {
      resetComputationRerun()

      setGraphs(
        produce(proxy => {
          removed.forEach(id => removeRoot(proxy, id))
          added.forEach(root => addNewRoot(proxy, root))
          updated.forEach(root => updateRoot(proxy, root))
        }),
      )
    })

    afterGraphUpdate()
  })

  onRuntimeMessage("ResetPanel", () => {
    setGraphs([])
    disposeAllNodes()
    afterGraphUpdate()
  })

  // TODO: batched updates are to be refactored
  // onRuntimeMessage("BatchedUpdate", updates => {
  //   batch(() => {
  //     for (const update of updates) {
  //       if (update.type === UpdateType.Signal) {
  //         updateSignal(update.payload.id, update.payload.value)
  //       } else {
  //         updateComputation(update.payload)
  //       }
  //     }
  //   })
  // })

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
