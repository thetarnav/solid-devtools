import { Accessor, batch, createRoot, createSelector, createSignal, untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Mapped, Graph, NodeID, SignalUpdate } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import { findOwnerById, findOwnerRootId } from "./graph"
import { arrayEquals, Mutable } from "@solid-primitives/utils"
import { createUpdatedSelector } from "./utils"
import { EncodedValue } from "@solid-devtools/shared/serialize"
import { Messages } from "@solid-devtools/shared/bridge"
import { untrackedCallback } from "@solid-devtools/shared/primitives"

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
  return { ...raw, selected: false }
}

function mapRawPath(rootId: NodeID, rawPath: readonly NodeID[]): Graph.Path {
  const path = rawPath.map(id => findOwnerById(rootId, id) ?? NOTFOUND)
  path.push(untrack(focused)!)
  return path
}

function createDetails(rootId: NodeID, raw: Readonly<Mapped.OwnerDetails>): Graph.OwnerDetails {
  const signals = raw.signals.reduce((signals, signal) => {
    signals[signal.id] = createSignalNode(signal)
    return signals
  }, {} as Graph.OwnerDetails["signals"])
  const path = mapRawPath(rootId, raw.path)
  const details: Mutable<Graph.OwnerDetails> = {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    path,
    rawPath: raw.path,
    signals,
  }
  if ("props" in raw) details.props = raw.props
  return details
}

function reconcileDetails(
  rootId: NodeID,
  proxy: Mutable<Graph.OwnerDetails>,
  raw: Readonly<Mapped.OwnerDetails>,
): void {
  // update path
  if (!arrayEquals(proxy.rawPath, raw.path)) {
    const path = mapRawPath(rootId, raw.path)
    proxy.rawPath.length = 0
    proxy.rawPath.push.apply(proxy.rawPath, raw.path)
    proxy.path.length = 0
    proxy.path.push.apply(proxy.path, path)
  }
  // update signals
  reconcileSignals(raw.signals, proxy.signals)
  // update props
  if (raw.props) {
    const newProps = raw.props.value
    proxy.props!.proxy = raw.props.proxy
    // the props cannot be deleted/added, so we can just update them
    const props = proxy.props!.value
    for (const [key, prop] of Object.entries(props)) {
      const newProp = newProps[key]
      if (!newProp) delete props[key]
      else {
        prop.signal = newProp.signal
        reconcileValue(prop.value, newProp.value)
      }
    }
    for (const [key, newProp] of Object.entries(newProps)) {
      if (!props[key]) props[key] = newProp
    }
  }
}

export type OwnerDetailsState = (
  | { focused: null; rootId: null; details: null }
  | { focused: Graph.Owner; rootId: NodeID; details: Graph.OwnerDetails | null }
) & { selectedSignals: NodeID[] }

const nullState: OwnerDetailsState = {
  focused: null,
  rootId: null,
  details: null,
  selectedSignals: [],
}

const exports = createRoot(() => {
  const [state, setState] = createStore<OwnerDetailsState>({ ...nullState })
  const focused = () => state.focused,
    focusedRootId = () => state.rootId,
    details = () => state.details

  const ownerSelectedSelector = createSelector<Graph.Owner | null, Graph.Owner>(focused)
  const useOwnerSelectedSelector = (owner: Graph.Owner): Accessor<boolean> =>
    ownerSelectedSelector.bind(void 0, owner)

  const setSelectedNode: (data: Graph.Owner | null | Messages["SendSelectedOwner"]) => void =
    untrackedCallback(data => {
      if (!data) setState({ ...nullState })
      else if ("name" in data) {
        // compare ids because state.focused is a proxy
        if (!state.focused || data.id !== state.focused.id)
          setState({ focused: data, rootId: findOwnerRootId(data), details: null })
      } else {
        const { nodeId, rootId } = data
        const owner = findOwnerById(rootId, nodeId)
        // compare ids because state.focused is a proxy
        if (owner && (!state.focused || owner.id !== state.focused.id))
          setState({ focused: owner, rootId, details: null })
      }
    })

  function updateDetails(raw: Mapped.OwnerDetails): void {
    const rootId = untrack(focusedRootId)
    if (!rootId) return warn("OwnerDetailsUpdate: rootId is null")

    setState("details", prev =>
      prev === null
        ? createDetails(rootId, raw)
        : produce((proxy: Mutable<Graph.OwnerDetails>) => reconcileDetails(rootId, proxy, raw))(
            prev,
          ),
    )
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

  /** variable for a callback in bridge.ts */
  let onSignalSelect: ((id: NodeID, selected: boolean) => void) | undefined
  const setOnSignalSelect = (fn: typeof onSignalSelect) => (onSignalSelect = fn)

  function toggleSignalFocus(id: NodeID, selected?: boolean) {
    setState("details", "signals", id, "selected", p => (selected = selected ?? !p))
    onSignalSelect!(id, selected!)
  }

  //
  // HOVERED ELEMENT
  //
  const [hoveredElement, setHoveredElement] = createSignal<string | null>(null)

  return {
    focused,
    focusedRootId,
    details,
    setSelectedNode,
    useOwnerSelectedSelector,
    useUpdatedSignalsSelector: useUpdatedSelector,
    updateDetails,
    handleSignalUpdates,
    handleGraphUpdate,
    toggleSignalFocus,
    setOnSignalSelect,
    hoveredElement,
    setHoveredElement,
  }
})
export const {
  focused,
  focusedRootId,
  details,
  setSelectedNode,
  useOwnerSelectedSelector,
  useUpdatedSignalsSelector,
  updateDetails,
  handleSignalUpdates,
  handleGraphUpdate,
  toggleSignalFocus,
  setOnSignalSelect,
  hoveredElement,
  setHoveredElement,
} = exports
