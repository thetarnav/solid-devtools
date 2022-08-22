import { Accessor, batch, createRoot, createSelector, createSignal, untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Mapped, Graph, NodeID, SignalUpdate } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import { findOwnerById, findOwnerRootId } from "./graph"
import { arrayEquals, Mutable } from "@solid-primitives/utils"
import { createArrayIncludesSelector, createArraySetToggle, createUpdatedSelector } from "./utils"
import { EncodedValue } from "@solid-devtools/shared/serialize"

function reconcileSignals(
  newSignals: readonly Mapped.Signal[],
  signals: Record<NodeID, Graph.Signal>,
): void {
  if (!newSignals.length && !signals.length) return
  const intersection: Mapped.Signal[] = []
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

function reconcileValue(proxy: EncodedValue<boolean>, next: EncodedValue<boolean>) {
  proxy.type = next.type
  // value is a literal, so we can just assign it
  if (next.value) proxy.value = next.value
  else delete proxy.value
  if (next.children) {
    // add new children
    if (!proxy.children) (proxy as EncodedValue<boolean>).children = next.children
    // reconcile children
    else {
      for (const key of Object.keys(proxy.children) as never[]) {
        // remove child
        if (!next.children[key]) delete proxy.children[key]
        // update child
        else reconcileValue(proxy.children[key], next.children[key])
      }
      for (const key of Object.keys(next.children) as never[]) {
        // add child
        if (!proxy.children[key]) proxy.children[key] = next.children[key]
      }
    }
  }
  // remove children
  else delete proxy.children
}

function createSignalNode(raw: Readonly<Mapped.Signal>): Graph.Signal {
  // const [value, setValue] = createSignal(raw.value)
  return { ...raw }
}

export type OwnerDetailsState =
  | { focused: null; rootId: null; details: null }
  | {
      focused: Graph.Owner
      rootId: NodeID
      details: Graph.OwnerDetails | null
    }

const nullState = { focused: null, rootId: null, details: null } as const

const exports = createRoot(() => {
  const [state, setState] = createStore<OwnerDetailsState>({ ...nullState })
  const focused = () => state.focused,
    focusedRootId = () => state.rootId,
    details = () => state.details

  const ownerFocusedSelector = createSelector<Graph.Owner | null, Graph.Owner>(focused)
  const useOwnerFocusedSelector = (owner: Graph.Owner): Accessor<boolean> =>
    ownerFocusedSelector.bind(void 0, owner)

  function setFocused(owner: Graph.Owner | null) {
    if (owner === untrack(() => state.focused)) return
    if (!owner) return setState({ ...nullState })
    setState({ focused: owner, rootId: findOwnerRootId(owner), details: null })
  }

  function updateDetails(raw: Mapped.OwnerDetails): void {
    const rootId = untrack(focusedRootId)
    if (!rootId) return warn("OwnerDetailsUpdate: rootId is null")

    setState("details", prev => {
      if (prev === null) {
        const signals: Graph.OwnerDetails["signals"] = {}
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
      return produce<Mutable<Graph.OwnerDetails>>(proxy => {
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

  function handleSignalUpdates(updates: SignalUpdate[], isUpdate = true): void {
    if (!untrack(details)) return
    batch(() => {
      isUpdate && addUpdated(updates.map(u => u.id))
      setState(
        "details",
        "signals",
        produce(proxy => {
          for (const update of updates) {
            const signal = proxy[update.id]
            if (!signal) return
            reconcileValue(signal.value, update.value)
          }
        }),
      )
    })
  }

  let onSignalSelect: ((id: NodeID, selected: boolean) => void) | undefined
  const setOnSignalSelect = (fn: typeof onSignalSelect) => (onSignalSelect = fn)
  // ? should this be a field in the GraphSignal?
  // there is no use for checking the selector outside of the ui part
  const [focusedSignals, setFocusedSignals] = createSignal<NodeID[]>([])
  const toggleSignalFocus = createArraySetToggle(focusedSignals, setFocusedSignals)
  const useFocusedSignalSelector = createArrayIncludesSelector(focusedSignals)

  function handleToggleSignalFocus(item: NodeID, state?: boolean) {
    if (state === undefined) state = !untrack(useFocusedSignalSelector(item))
    toggleSignalFocus(item, state)
    onSignalSelect?.(item, state)
  }

  return {
    focused,
    focusedRootId,
    details,
    setFocused,
    useOwnerFocusedSelector,
    useUpdatedSignalsSelector: useUpdatedSelector,
    updateDetails,
    handleSignalUpdates,
    handleGraphUpdate,
    toggleSignalFocus: handleToggleSignalFocus,
    useFocusedSignalSelector,
    setOnSignalSelect,
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
  toggleSignalFocus,
  useFocusedSignalSelector,
  setOnSignalSelect,
} = exports
