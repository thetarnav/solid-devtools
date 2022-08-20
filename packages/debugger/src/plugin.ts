import {
  Accessor,
  batch,
  createEffect,
  createSignal,
  getOwner,
  runWithOwner,
  untrack,
} from "solid-js"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { omit } from "@solid-primitives/immutable"
import { createLazyMemo } from "@solid-primitives/memo"
import { createStaticStore } from "@solid-primitives/utils"
import {
  MappedComponent,
  MappedRoot,
  MappedOwnerDetails,
  SolidOwner,
  MappedOwner,
  RootsUpdates,
  NodeID,
  ComputationUpdate,
  SignalUpdate,
  SolidSignal,
} from "@solid-devtools/shared/graph"
import { EncodedValue, encodeValue } from "@solid-devtools/shared/serialize"
import { createBatchedUpdateEmitter, createConsumers, createInternalRoot } from "./utils"
import { clearOwnerObservers, ComputationUpdateHandler, SignalUpdateHandler } from "./walker"
import { forceRootUpdate } from "./roots"
import { Merge } from "type-fest"

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

const NULL_SELECTED_STATE = {
  id: null,
  rootId: null,
  owner: null,
  updated: false,
  details: null,
  signalMap: {} as Record<NodeID, SolidSignal>,
} as const

export type FocusedState =
  | typeof NULL_SELECTED_STATE
  | Merge<typeof NULL_SELECTED_STATE, { readonly id: NodeID; readonly rootId: NodeID }>
  | {
      readonly id: NodeID
      readonly rootId: NodeID
      readonly owner: SolidOwner
      readonly updated: boolean
      readonly details: MappedOwnerDetails
      readonly signalMap: Record<NodeID, SolidSignal>
    }

export type SignaledRoot = {
  readonly id: NodeID
  readonly tree: Accessor<MappedOwner>
  readonly components: Accessor<MappedComponent[]>
}

/** @internal */
export type _SignaledRoot = {
  id: NodeID
  tree: Accessor<MappedOwner>
  setTree: (tree: MappedOwner) => void
  components: Accessor<MappedComponent[]>
  setComponents: (components: MappedComponent[]) => void
}

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void
export type BatchSignalUpdatesHandler = (payload: SignalUpdate[]) => void

export type PluginFactoryData = {
  readonly triggerUpdate: VoidFunction
  readonly forceTriggerUpdate: VoidFunction
  readonly handleComputationUpdates: (listener: BatchComputationUpdatesHandler) => VoidFunction
  readonly handleSignalUpdates: (listener: BatchSignalUpdatesHandler) => VoidFunction
  readonly roots: Accessor<Record<NodeID, SignaledRoot>>
  readonly serialisedRoots: Accessor<Record<NodeID, MappedOwner>>
  readonly rootsUpdates: Accessor<RootsUpdates>
  readonly components: Accessor<MappedComponent[]>
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

  const serialisedRoots = createLazyMemo<Record<NodeID, MappedOwner>>(() => {
    const serialisedRoots: Record<NodeID, MappedOwner> = {}
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

  function updateRoot(newRoot: MappedRoot): void {
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
  const [focusedState, setFocusedState] = createStaticStore<FocusedState>(NULL_SELECTED_STATE)

  // make sure we don't keep the listeners around
  createEffect((prev: SolidOwner | null = null) => {
    if (prev) clearOwnerObservers(prev)
    return focusedState.owner
  })

  const setFocusedOwner: SetFocusedOwner = payload => {
    if (!payload) return setFocusedState(NULL_SELECTED_STATE)
    const id = untrack(() => focusedState.id)
    if (id === payload.ownerId) return
    setFocusedState({
      ...NULL_SELECTED_STATE,
      id: payload.ownerId,
      rootId: payload.rootId,
    })
    forceRootUpdate(payload.rootId)
  }

  const setFocusedOwnerDetails = (
    newOwner: SolidOwner | null,
    newDetails: MappedOwnerDetails | null,
    newSignalMap: Record<NodeID, SolidSignal>,
  ) => {
    if (newOwner && newDetails) {
      setFocusedState(prev => ({
        id: prev.id!,
        rootId: prev.rootId!,
        owner: newOwner,
        updated: prev.owner === newOwner,
        details: newDetails,
        signalMap: newSignalMap,
      }))
    } else setFocusedState(NULL_SELECTED_STATE)
  }

  //
  // Selected Signals:
  //
  const selectedSignalIds: Set<NodeID> = new Set()
  const setSelectedSignal: PluginFactoryData["setSelectedSignal"] = ({ id, selected }) => {
    const signalMap = untrack(() => focusedState.signalMap)
    const signal = signalMap[id] as SolidSignal | undefined
    if (!signal) return null
    if (selected) selectedSignalIds.add(id)
    else selectedSignalIds.delete(id)
    return encodeValue(signal.value, selected)
  }

  //
  // Signal updates:
  //
  const [handleSignalUpdates, _pushSignalUpdate] = createBatchedUpdateEmitter<SignalUpdate>()
  const pushSignalUpdate: SignalUpdateHandler = (id, value) => {
    if (!untrack(() => focusedState.id)) return
    const isSelected = selectedSignalIds.has(id)
    const payload: SignalUpdate = { id, value: encodeValue(value, isSelected) }
    _pushSignalUpdate(payload)
  }

  //
  // Computation updates:
  //
  const [handleComputationUpdates, _pushComputationUpdate] =
    createBatchedUpdateEmitter<ComputationUpdate>()
  const pushComputationUpdate: ComputationUpdateHandler = (rootId, id) => {
    if (!untrack(observeComputations)) return
    _pushComputationUpdate({ rootId, id })
  }

  //
  // Components:
  //
  const components = createLazyMemo<MappedComponent[]>(() =>
    Object.values(roots()).reduce((arr: MappedComponent[], root) => {
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
    components,
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
    setFocusedOwnerDetails,
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
  setFocusedOwnerDetails,
  focusedState,
  pushComputationUpdate,
} = exported
