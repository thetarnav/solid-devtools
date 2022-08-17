import { Accessor, batch, createRoot, createSelector, untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"
import {
  GraphOwner,
  GraphSignal,
  MappedOwnerDetails,
  MappedSignal,
  NodeID,
  OwnerDetails,
  SignalUpdate,
} from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import { findOwnerById, findOwnerRootId } from "./graph"
import { arrayEquals, Mutable } from "@solid-primitives/utils"
import { createUpdatedSelector } from "./utils"

function reconcileSignals(
  newSignals: readonly MappedSignal[],
  signals: Record<NodeID, GraphSignal>,
): void {
  if (!newSignals.length && !signals.length) return
  const intersection: MappedSignal[] = []
  for (const id in signals) {
    const newSignal = newSignals.find(s => s.id === id)
    if (newSignal) {
      const signal = signals[id]
      // reconcile signal observers
      signal.observers.length = 0
      signal.observers.push.apply(signal.observers, newSignal.observers)
      intersection.push(newSignal)
    } else {
      // remove signal
      delete signals[id]
    }
  }
  // map new signals
  for (const newSignal of newSignals) {
    if (!intersection.includes(newSignal)) signals[newSignal.id] = createSignalNode(newSignal)
  }
}

function createSignalNode(raw: Readonly<MappedSignal>): GraphSignal {
  // const [value, setValue] = createSignal(raw.value)
  return { ...raw }
}

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
        raw.signals.forEach(signal => (signals[signal.id] = createSignalNode(signal)))
        return {
          id: raw.id,
          name: raw.name,
          type: raw.type,
          path: raw.path.map(id => findOwnerById(rootId, id) ?? NOTFOUND),
          rawPath: raw.path,
          signals,
        }
      }
      return produce<Mutable<OwnerDetails>>(proxy => {
        // update path
        if (!arrayEquals(proxy.rawPath, raw.path)) {
          const newPath = raw.path.map(id => findOwnerById(rootId, id) ?? NOTFOUND)
          proxy.path.length = 0
          proxy.path.push.apply(proxy.path, newPath)
        }
        // update signals
        reconcileSignals(raw.signals, proxy.signals)
      })(prev)
    })
  }

  const [useUpdatedSelector, addUpdated, clearUpdated] = createUpdatedSelector()

  function handleGraphUpdate() {
    clearUpdated()
  }

  function handleSignalUpdates(updates: SignalUpdate[]): void {
    if (!untrack(() => state.details)) return
    batch(() => {
      addUpdated(updates.map(u => u.id))
      setState(
        "details",
        "signals",
        produce(proxy => {
          for (const update of updates) {
            const signal = proxy[update.id]
            if (!signal) return
            signal.value.type = update.value.type
            if ("value" in update.value) (signal.value as any).value = update.value.value
            else delete (signal.value as any).value
          }
        }),
      )
    })
  }

  return {
    focused: () => state.focused,
    focusedRootId: () => state.rootId,
    details: () => state.details,
    setFocused,
    useOwnerFocusedSelector,
    useUpdatedSignalsSelector: useUpdatedSelector,
    updateDetails,
    handleSignalUpdates,
    handleGraphUpdate,
  }
})
export const {
  focused,
  focusedRootId,
  details,
  setFocused,
  useOwnerFocusedSelector,
  useUpdatedSignalsSelector,
  updateDetails,
  handleSignalUpdates,
  handleGraphUpdate,
} = exports
