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
import { throttle } from "@solid-primitives/scheduled"
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
} from "@solid-devtools/shared/graph"
import { encodeValue } from "@solid-devtools/shared/serialize"
import { createConsumers, createInternalRoot } from "./utils"
import { clearOwnerObservers, ComputationUpdateHandler, SignalUpdateHandler } from "./walker"
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
  | { id: null; rootId: null; owner: null; updated: false; details: null }
  | { id: NodeID; rootId: NodeID; owner: null; updated: false; details: null }
  | { id: NodeID; rootId: NodeID; owner: SolidOwner; updated: boolean; details: MappedOwnerDetails }
>

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
  readonly setSelectedSignal: (payload: { id: NodeID; selected: boolean }) => void
}

export type PluginFactory = (data: PluginFactoryData) => {
  enabled?: Accessor<boolean>
  observeComputations?: Accessor<boolean>
  gatherComponents?: Accessor<boolean>
}

const nullFocusedState = {
  id: null,
  rootId: null,
  owner: null,
  updated: false,
  details: null,
} as const

const exported = createInternalRoot(() => {
  const owner = getOwner()!

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
        [rootId]: {
          id: rootId,
          tree,
          setTree,
          components,
          setComponents,
        },
      }))
    }
  }

  //
  // Focused Owner details:
  //
  const [focusedState, setFocusedState] = createStaticStore<FocusedState>(nullFocusedState)

  // make sure we don't keep the listeners around
  createEffect((prev: SolidOwner | null = null) => {
    if (prev) clearOwnerObservers(prev)
    return focusedState.owner
  })

  //
  // Signal updates:
  //
  // TODO: abstract it to a separate module
  const [handleSignalUpdates, pushSignalUpdate] = (() => {
    const [handleSignalUpdates, emitSignalUpdates] = createSimpleEmitter<SignalUpdate[]>()
    const signalUpdates: SignalUpdate[] = []

    const triggerComputationUpdateEmit = throttle(() => {
      // dedupe computation updates
      const updatedNodes = new Set<NodeID>()
      const updates: SignalUpdate[] = []
      for (let i = signalUpdates.length - 1; i >= 0; i--) {
        const update = signalUpdates[i]
        if (updatedNodes.has(update.id)) continue
        updatedNodes.add(update.id)
        updates.push(update)
      }
      signalUpdates.length = 0
      emitSignalUpdates(updates)
    })

    const pushComputationUpdate: SignalUpdateHandler = (id, value) => {
      if (!untrack(() => focusedState.id)) return
      signalUpdates.push({ id, value: encodeValue(value) })
      triggerComputationUpdateEmit()
    }

    return [handleSignalUpdates, pushComputationUpdate]
  })()

  const setFocusedOwner: SetFocusedOwner = payload => {
    if (!payload) return setFocusedState(nullFocusedState)
    const id = untrack(() => focusedState.id)
    if (id === payload.ownerId) return
    setFocusedState({
      id: payload.ownerId,
      rootId: payload.rootId,
      owner: null,
      updated: false,
      details: null,
    })
    forceRootUpdate(payload.rootId)
  }

  const setFocusedOwnerDetails = (
    newOwner: SolidOwner | null,
    newDetails: MappedOwnerDetails | null,
  ) => {
    if (newOwner && newDetails) {
      setFocusedState(prev => ({
        id: prev.id!,
        rootId: prev.rootId!,
        owner: newOwner,
        updated: prev.owner === newOwner,
        details: newDetails,
      }))
    } else setFocusedState(nullFocusedState)
  }

  //
  // Selected Signals:
  //
  const selectedSignalIds: Set<NodeID> = new Set()

  const setSelectedSignal: PluginFactoryData["setSelectedSignal"] = ({ id, selected }) => {
    if (selected) {
      if (selectedSignalIds.has(id)) return
      selectedSignalIds.add(id)
      // TODO: run add logic
    } else {
      selectedSignalIds.delete(id)
    }
  }

  //
  // Computation updates:
  //
  // TODO: abstract it to a separate module
  const [handleComputationUpdates, pushComputationUpdate] = (() => {
    const [handleComputationUpdates, emitComputationUpdates] =
      createSimpleEmitter<ComputationUpdate[]>()
    const computationUpdates: ComputationUpdate[] = []

    const triggerComputationUpdateEmit = throttle(() => {
      // dedupe computation updates
      const updatedNodes = new Set<NodeID>()
      const updates: ComputationUpdate[] = []
      for (let i = computationUpdates.length - 1; i >= 0; i--) {
        const update = computationUpdates[i]
        if (updatedNodes.has(update.nodeId)) continue
        updatedNodes.add(update.nodeId)
        updates.push(update)
      }
      computationUpdates.length = 0
      emitComputationUpdates(updates)
    })

    const pushComputationUpdate: ComputationUpdateHandler = (rootId, nodeId) => {
      if (!untrack(observeComputations)) return
      computationUpdates.push({ rootId, nodeId })
      triggerComputationUpdateEmit()
    }

    return [handleComputationUpdates, pushComputationUpdate]
  })()

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
