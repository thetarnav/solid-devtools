import { batch, createComputed, createRoot, createSelector, createSignal, untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Mapped, NodeID, NodeType, SignalUpdate } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import structure, { Structure } from "./structure"
import { arrayEquals, Mutable } from "@solid-primitives/utils"
import { createUpdatedSelector } from "./utils"
import { EncodedValue } from "@solid-devtools/shared/serialize"
import { Messages } from "@solid-devtools/shared/bridge"
import { untrackedCallback } from "@solid-devtools/shared/primitives"

export namespace Inspector {
  export type Signal = {
    readonly type: NodeType.Signal | NodeType.Memo
    readonly name: string
    readonly id: NodeID
    readonly observers: NodeID[]
    readonly value: EncodedValue<boolean>
    readonly selected: boolean
  }

  export type Props = {
    readonly proxy: boolean
    readonly record: Record<
      string,
      { readonly selected: boolean; readonly value: EncodedValue<boolean> }
    >
  }

  export interface Details {
    readonly id: NodeID
    readonly name: string
    readonly type: NodeType
    readonly path: Structure.Node[]
    readonly rawPath: NodeID[]
    readonly signals: Record<NodeID, Signal>
    readonly props?: Props
    // TODO: more to come
  }
}

function reconcileSignals(
  newSignals: readonly Mapped.Signal[],
  signals: Record<NodeID, Inspector.Signal>,
): void {
  const prev = new Set(Object.keys(signals))
  for (const raw of newSignals) {
    const { id } = raw
    const signal = signals[id]
    if (signal) {
      // update signal observers
      signal.observers.length = 0
      signal.observers.push.apply(signal.observers, raw.observers)
      // update signal value
      reconcileValue(signal.value, raw.value)
      prev.delete(id)
    }
    // add new signal
    else signals[id] = createSignalNode(raw)
  }
  // remove signals
  for (const id of prev) delete signals[id]
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

function createSignalNode(raw: Readonly<Mapped.Signal>): Inspector.Signal {
  return { ...raw, selected: false }
}

function getNodePath(
  rootId: NodeID,
  focused: Structure.Node,
  rawPath: readonly NodeID[],
): Structure.Node[] {
  const path: Structure.Node[] = []
  for (const id of rawPath) {
    // rootId of the inspected node don't have to be the same for the rest of the path
    let node = structure.getNode(rootId, id) ?? structure.findNode(id)?.node
    if (node) path.push(node)
  }
  path.push(focused)
  return path
}

function reconcileProps(proxy: Mutable<Inspector.Props>, raw: Mapped.Props): void {
  const record = proxy.record
  const newRecord = raw.record
  proxy.proxy = raw.proxy
  // the props cannot be deleted/added, so we can just update them
  for (const [key, prop] of Object.entries(record)) {
    const newProp = newRecord[key]
    if (!newProp) delete record[key]
    else reconcileValue(prop.value, newProp)
  }
  for (const [key, newProp] of Object.entries(newRecord)) {
    if (!record[key]) record[key] = { value: newProp, selected: false }
  }
}

function createDetails(
  rootId: NodeID,
  node: Structure.Node,
  raw: Readonly<Mapped.OwnerDetails>,
): Inspector.Details {
  const signals = raw.signals.reduce((signals, signal) => {
    signals[signal.id] = createSignalNode(signal)
    return signals
  }, {} as Inspector.Details["signals"])
  const path = getNodePath(rootId, node, raw.path)
  const details: Mutable<Inspector.Details> = {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    path,
    rawPath: raw.path,
    signals,
  }
  if (raw.props) {
    details.props = {
      proxy: raw.props.proxy,
      record: Object.entries(raw.props.record).reduce((props, [propName, value]) => {
        props[propName] = { value, selected: false }
        return props
      }, {} as Inspector.Props["record"]),
    }
  }
  return details
}

function reconcileDetails(
  rootId: NodeID,
  node: Structure.Node,
  proxy: Mutable<Inspector.Details>,
  raw: Readonly<Mapped.OwnerDetails>,
): void {
  // update path
  if (!arrayEquals(proxy.rawPath, raw.path)) {
    const path = getNodePath(rootId, node, raw.path)
    proxy.rawPath.length = 0
    proxy.rawPath.push.apply(proxy.rawPath, raw.path)
    proxy.path.length = 0
    proxy.path.push.apply(proxy.path, path)
  }
  // update signals
  reconcileSignals(raw.signals, proxy.signals)
  // update props
  if (raw.props) reconcileProps(proxy.props!, raw.props)
}

export type OwnerDetailsState =
  | { node: null; rootId: null; details: null }
  | { node: Structure.Node; rootId: NodeID; details: Inspector.Details | null }

const nullState: OwnerDetailsState = { node: null, rootId: null, details: null }

const inspector = createRoot(() => {
  const [state, setState] = createStore<OwnerDetailsState>({ ...nullState })

  const isNodeInspected = createSelector<NodeID | null, NodeID>(() =>
    state.node ? state.node.id : null,
  )

  const setInspectedNode: (data: Structure.Node | null | Messages["SendSelectedOwner"]) => void =
    untrackedCallback(data => {
      if (!data) setState({ ...nullState })
      else if ("name" in data) {
        const { id } = data
        // compare ids because state.node is a proxy
        if (!state.node || id !== state.node.id) {
          const find = structure.findNode(id)
          find && setState({ node: data, rootId: find.rootId, details: null })
        }
      } else {
        const { nodeId, rootId } = data
        const node = structure.getNode(rootId, nodeId)
        // compare ids because state.node is a proxy
        if (node && (!state.node || node.id !== state.node.id))
          setState({ node: node, rootId, details: null })
      }
    })

  // clear the inspector when the inspected node is removed
  createComputed(() => {
    structure.structure()
    untrack(() => {
      if (state.node) {
        structure.getNode(state.rootId, state.node.id) || setInspectedNode(null)
      }
    })
  })

  const updateDetails = untrackedCallback((raw: Mapped.OwnerDetails) => {
    const { rootId, node } = state
    if (!rootId || !node) return warn("OwnerDetailsUpdate: rootId is null")

    setState("details", prev => {
      return prev === null
        ? createDetails(rootId, node, raw)
        : produce<Mutable<Inspector.Details>>(proxy => reconcileDetails(rootId, node, proxy, raw))(
            prev,
          )
    })
  })

  const [isUpdated, addUpdated, clearUpdated] = createUpdatedSelector()

  const handleSignalUpdates = untrackedCallback((updates: SignalUpdate[], isUpdate = true) => {
    if (!state.details) return
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
  })

  const handlePropsUpdate = untrackedCallback((props: Mapped.Props) => {
    if (!state.details || !state.details.props) return
    setState(
      "details",
      "props",
      produce(proxy => reconcileProps(proxy!, props)),
    )
  })

  /** variable for a callback in bridge.ts */
  let onInspectValue: ((payload: Messages["ToggleInspectedValue"]) => void) | undefined
  const setOnInspectValue = (fn: typeof onInspectValue) => (onInspectValue = fn)

  function togglePropFocus(id: string, selected?: boolean): void {
    setState("details", "props", "record", id, "selected", p => (selected = selected ?? !p))
    onInspectValue!({ type: "prop", id, selected: selected! })
  }
  function toggleSignalFocus(id: NodeID, selected?: boolean) {
    setState("details", "signals", id, "selected", p => (selected = selected ?? !p))
    onInspectValue!({ type: "signal", id, selected: selected! })
  }

  //
  // HOVERED ELEMENT
  //
  const [hoveredElement, setHoveredElement] = createSignal<string | null>(null)

  function toggleHoveredElement(id: NodeID, selected?: boolean) {
    setHoveredElement(p => (p === id ? (selected ? id : null) : selected ? id : p))
  }

  return {
    state,
    setInspectedNode,
    isNodeInspected,
    isUpdated,
    clearUpdated,
    updateDetails,
    handleSignalUpdates,
    handlePropsUpdate,
    toggleSignalFocus,
    togglePropFocus,
    setOnInspectValue,
    hoveredElement,
    toggleHoveredElement,
  }
})
export default inspector
