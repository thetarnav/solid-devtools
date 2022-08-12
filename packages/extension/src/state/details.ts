import { Accessor, createRoot, createSelector, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import { GraphOwner, MappedOwnerDetails, NodeID, OwnerDetails } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import { findOwnerById, findOwnerRootId } from "./graph"

// function reconcileSignals(newSignals: readonly MappedSignal[], signals: GraphSignal[]): void {
//   if (!newSignals.length && !signals.length) return
//   const removed: NodeID[] = []
//   const intersection: MappedSignal[] = []
//   for (const signal of signals) {
//     const newSignal = newSignals.find(compareId.bind(signal))
//     if (newSignal) {
//       // reconcile signal observers
//       reconcileArrayByIds(newSignal.observers, signal.observers, mapObserver)
//       intersection.push(newSignal)
//     } else removed.push(signal.id)
//   }
//   // remove
//   if (removed.length) mutateFilter(signals, o => !removed.includes(o.id))
//   // map new signals
//   for (const raw of newSignals) {
//     if (!intersection.includes(raw)) signals.push(createSignalNodeAsync(raw))
//   }
// }

// function createSignalNode(raw: Readonly<MappedSignal>): GraphSignal {
//   return { ...raw }
// }

export type OwnerDetailsState =
  | { focused: null; rootId: null; details: null }
  | {
      focused: GraphOwner
      rootId: NodeID
      details: OwnerDetails | null
    }

const nullState = { focused: null, rootId: null, details: null } as const

const exports = createRoot(() => {
  const [state, setState] = createStore<OwnerDetailsState>({ ...nullState })

  const ownerFocusedSelector = createSelector<GraphOwner | null, GraphOwner>(() => state.focused)

  const useOwnerFocusedSelector = (owner: GraphOwner): Accessor<boolean> =>
    ownerFocusedSelector.bind(void 0, owner)

  function setFocused(owner: GraphOwner | null) {
    if (owner === untrack(() => state.focused)) return
    if (!owner) return setState({ ...nullState })
    setState({ focused: owner, rootId: findOwnerRootId(owner), details: null })
  }

  function updateDetails(raw: MappedOwnerDetails): void {
    const rootId = untrack(() => state.rootId)
    if (!rootId) return warn("OwnerDetailsUpdate: rootId is null")

    setState("details", prev => {
      if (prev === null) {
        const signals: OwnerDetails["signals"] = {}
        raw.signals.forEach(signal => (signals[signal.id] = signal))
        return {
          id: raw.id,
          name: raw.name,
          type: raw.type,
          path: raw.path.map(id => findOwnerById(rootId, id) ?? NOTFOUND),
          signals,
        }
      }
      return prev
    })
  }

  return {
    focused: () => state.focused,
    focusedRootId: () => state.rootId,
    details: () => state.details,
    setFocused,
    useOwnerFocusedSelector,
    updateDetails,
  }
})
export const {
  focused,
  focusedRootId,
  details,
  setFocused,
  useOwnerFocusedSelector,
  updateDetails,
} = exports
