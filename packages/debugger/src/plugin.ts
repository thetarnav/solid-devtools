import { Accessor, batch, createSignal, getOwner, runWithOwner, untrack } from "solid-js"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { omit } from "@solid-primitives/immutable"
import { createLazyMemo } from "@solid-primitives/memo"
import { createStaticStore } from "@solid-primitives/utils"
import {
  Mapped,
  Solid,
  RootsUpdates,
  NodeID,
  ComputationUpdate,
  SignalUpdate,
} from "@solid-devtools/shared/graph"
import { EncodedValue, encodeValue } from "@solid-devtools/shared/serialize"
import { createConsumers, untrackedCallback } from "@solid-devtools/shared/primitives"
import { createBatchedUpdateEmitter, createInternalRoot } from "./utils"
import { ComputationUpdateHandler, SignalUpdateHandler, WalkerSelectedResult } from "./walker"
import { forceRootUpdate } from "./roots"

/*
DETAILS:

- type of the node
- path
- signals declared in it (memos too)
  - their observers and sources
- stores
- their observers and sources as well (this may be too complicated to do for now)
- current and previous value (only if the node is a computation)
- sources (only if the node is a computation)
- observers (only if the node is a memo)
- rendered HTML element if node is a component
- component props
*/

export type SetFocusedOwner = (payload: { rootId: NodeID; ownerId: NodeID } | null) => void

export type FocusedState = Readonly<
  {
    signalMap: Record<NodeID, Solid.Signal>
    elementMap: Record<NodeID, HTMLElement>
  } & (
    | { id: null; rootId: null; owner: null; details: null }
    | { id: NodeID; rootId: NodeID; owner: null; details: null }
    | { id: NodeID; rootId: NodeID; owner: Solid.Owner; details: Mapped.OwnerDetails }
  )
>

const getNullFocusedState = (): FocusedState => ({
  id: null,
  rootId: null,
  owner: null,
  details: null,
  signalMap: {},
  elementMap: {},
})

export type SignaledRoot = {
  readonly id: NodeID
  readonly tree: Accessor<Mapped.Owner>
  readonly components: Accessor<Mapped.Component[]>
}

/** @internal */
export type _SignaledRoot = SignaledRoot & {
  readonly setTree: (tree: Mapped.Owner) => void
  readonly setComponents: (components: Mapped.Component[]) => void
}

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void
export type BatchSignalUpdatesHandler = (payload: SignalUpdate[]) => void

export type PluginFactoryData = {
  readonly triggerUpdate: VoidFunction
  readonly forceTriggerUpdate: VoidFunction
  readonly handleComputationUpdates: (listener: BatchComputationUpdatesHandler) => VoidFunction
  readonly handleSignalUpdates: (listener: BatchSignalUpdatesHandler) => VoidFunction
  readonly roots: Accessor<Record<NodeID, SignaledRoot>>
  readonly serialisedRoots: Accessor<Record<NodeID, Mapped.Owner>>
  readonly rootsUpdates: Accessor<RootsUpdates>
  readonly componentList: Accessor<Mapped.Component[]>
  readonly setFocusedOwner: SetFocusedOwner
  readonly focusedState: FocusedState
  readonly setSelectedSignal: (payload: {
    id: NodeID
    selected: boolean
  }) => EncodedValue<boolean> | null
}

export type PluginFactory = (data: PluginFactoryData) => {
  enabled?: Accessor<boolean>
  observeComputations?: Accessor<boolean>
  gatherComponents?: Accessor<boolean>
}

const exported = createInternalRoot(() => {
  /** throttled global update */
  const [onUpdate, triggerUpdate] = createSimpleEmitter()
  /** forced — immediate global update */
  const [onForceUpdate, forceTriggerUpdate] = createSimpleEmitter()

  //
  // Consumers:
  //
  const [enabled, addDebuggerConsumer] = createConsumers()
  const [gatherComponents, addGatherComponentsConsumer] = createConsumers()
  const [observeComputations, addObserveComputationsConsumer] = createConsumers()

  //
  // Roots:
  //
  const [roots, setRoots] = createSignal<Record<NodeID, _SignaledRoot>>({})

  const serialisedRoots = createLazyMemo<Record<NodeID, Mapped.Owner>>(() => {
    const serialisedRoots: Record<NodeID, Mapped.Owner> = {}
    for (const [id, root] of Object.entries(roots())) {
      serialisedRoots[id] = root.tree()
    }
    return serialisedRoots
  })

  const updatedIds = new Set<NodeID>()
  const removedIds = new Set<NodeID>()
  const rootsUpdates = createLazyMemo<RootsUpdates>(() => {
    const _updatedIds = [...updatedIds].filter(id => !removedIds.has(id))

    const sRoots = serialisedRoots()
    const updated: RootsUpdates["updated"] = _updatedIds.map(id => ({ id, tree: sRoots[id] }))
    const removed: RootsUpdates["removed"] = [...removedIds]

    updatedIds.clear()
    removedIds.clear()

    return { updated, removed }
  })

  function removeRoot(rootId: NodeID) {
    removedIds.add(rootId)
    setRoots(map => omit(map, rootId))
  }

  function updateRoot(newRoot: Mapped.Root): void {
    const rootMap = untrack(roots)
    const rootId = newRoot.id
    const root = rootMap[rootId]
    updatedIds.add(rootId)
    if (root) {
      batch(() => {
        root.setTree(newRoot.tree)
        root.setComponents(newRoot.components)
      })
    } else {
      const [tree, setTree] = createSignal(newRoot.tree)
      const [components, setComponents] = createSignal(newRoot.components)
      setRoots(map => ({
        ...map,
        [rootId]: { id: rootId, tree, setTree, components, setComponents },
      }))
    }
  }

  //
  // Focused Owner details:
  //
  const [focusedState, setFocusedState] = createStaticStore(getNullFocusedState())

  const setFocusedOwner: SetFocusedOwner = payload => {
    if (!payload) return setFocusedState(getNullFocusedState())
    const id = untrack(() => focusedState.id)
    if (id === payload.ownerId) return
    setFocusedState({
      ...getNullFocusedState(),
      id: payload.ownerId,
      rootId: payload.rootId,
    })
    forceRootUpdate(payload.rootId)
  }

  const setSelectedDetails = (payload: WalkerSelectedResult) => {
    setFocusedState(payload.details ? payload : getNullFocusedState())
  }

  //
  // Selected Signals:
  //
  const selectedSignalIds: Set<NodeID> = new Set()
  const setSelectedSignal: PluginFactoryData["setSelectedSignal"] = untrackedCallback(
    ({ id, selected }) => {
      const { signalMap, elementMap } = focusedState
      const signal = signalMap[id] as Solid.Signal | undefined
      if (!signal) return null
      if (selected) selectedSignalIds.add(id)
      else selectedSignalIds.delete(id)
      return encodeValue(signal.value, selected, elementMap)
    },
  )

  const [handleSignalUpdates, _pushSignalUpdate] = createBatchedUpdateEmitter<SignalUpdate>()
  const pushSignalUpdate: SignalUpdateHandler = untrackedCallback((id, value) => {
    if (!enabled() || !focusedState.id) return
    const isSelected = selectedSignalIds.has(id)
    _pushSignalUpdate({ id, value: encodeValue(value, isSelected, focusedState.elementMap) })
  })

  //
  // Computation updates:
  //
  const [handleComputationUpdates, _pushComputationUpdate] =
    createBatchedUpdateEmitter<ComputationUpdate>()
  const pushComputationUpdate: ComputationUpdateHandler = (rootId, id) => {
    if (!untrack(enabled) || !untrack(observeComputations)) return
    _pushComputationUpdate({ rootId, id })
  }

  //
  // Components:
  //
  const componentList = createLazyMemo<Mapped.Component[]>(() =>
    Object.values(roots()).reduce((arr: Mapped.Component[], root) => {
      arr.push.apply(arr, root.components())
      return arr
    }, []),
  )

  const pluginData: PluginFactoryData = {
    handleComputationUpdates,
    handleSignalUpdates,
    roots,
    serialisedRoots,
    rootsUpdates,
    componentList,
    triggerUpdate,
    forceTriggerUpdate,
    setFocusedOwner,
    focusedState,
    setSelectedSignal,
  }
  const owner = getOwner()!
  function registerDebuggerPlugin(factory: PluginFactory) {
    runWithOwner(owner, () => {
      const { enabled, gatherComponents, observeComputations } = factory(pluginData)
      enabled && addDebuggerConsumer(enabled)
      gatherComponents && addGatherComponentsConsumer(gatherComponents)
      observeComputations && addObserveComputationsConsumer(observeComputations)
    })
  }

  return {
    onUpdate,
    onForceUpdate,
    enabled,
    registerDebuggerPlugin,
    updateRoot,
    removeRoot,
    gatherComponents,
    pushSignalUpdate,
    setSelectedDetails,
    focusedState,
    pushComputationUpdate,
  }
})
export const {
  onUpdate,
  onForceUpdate,
  enabled,
  gatherComponents,
  registerDebuggerPlugin,
  updateRoot,
  removeRoot,
  pushSignalUpdate,
  setSelectedDetails,
  focusedState,
  pushComputationUpdate,
} = exported
