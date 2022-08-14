import {
  Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  runWithOwner,
  untrack,
} from "solid-js"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { omit } from "@solid-primitives/immutable"
import { createLazyMemo } from "@solid-primitives/memo"
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
import { createConsumers, createInternalRoot, getSafeValue } from "./utils"
import { clearOwnerObservers, ComputationUpdateHandler, SignalUpdateHandler } from "./walker"
import { forceRootUpdate } from "./roots"
import { throttle } from "@solid-primitives/scheduled"

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

export type PluginFactory = (data: {
  triggerUpdate: VoidFunction
  forceTriggerUpdate: VoidFunction
  handleComputationUpdates: (listener: BatchComputationUpdatesHandler) => VoidFunction
  handleSignalUpdates: (listener: BatchSignalUpdatesHandler) => VoidFunction
  roots: Accessor<Record<NodeID, SignaledRoot>>
  serialisedRoots: Accessor<Record<NodeID, MappedOwner>>
  rootsUpdates: Accessor<RootsUpdates>
  components: Accessor<MappedComponent[]>
  setFocusedOwner: SetFocusedOwner
  focusedState: Accessor<FocusedState>
}) => {
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
  const [focusedState, setFocusedState] = createSignal<FocusedState>(nullFocusedState)

  // TODO: focused state probably should consist of multiple singlas
  const focusedRootId = createMemo(() => focusedState().rootId)
  const focusedId = createMemo(() => focusedState().id)
  const ficusedOwner = createMemo(() => focusedState().owner)

  // make sure we don't keep the listeners around
  createEffect((prev: SolidOwner | null = null) => {
    if (prev) clearOwnerObservers(prev)
    return ficusedOwner()
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

    const pushComputationUpdate: SignalUpdateHandler = ({ id, value }) => {
      if (!untrack(focusedId)) return
      signalUpdates.push({ id, value: getSafeValue(value) })
      triggerComputationUpdateEmit()
    }

    return [handleSignalUpdates, pushComputationUpdate]
  })()

  const setFocusedOwner: SetFocusedOwner = payload => {
    if (!payload) return setFocusedState(nullFocusedState)
    const { id } = untrack(focusedState)
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

  function registerDebuggerPlugin(factory: PluginFactory) {
    runWithOwner(owner, () => {
      const { enabled, gatherComponents, observeComputations } = factory({
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
      })
      enabled && addDebuggerConsumer(enabled)
      gatherComponents && addGatherComponentsConsumer(gatherComponents)
      observeComputations && addObserveComputationsConsumer(observeComputations)
    })
  }

  return {
    onUpdate,
    onForceUpdate,
    triggerUpdate,
    forceTriggerUpdate,
    enabled,
    roots,
    setRoots,
    registerDebuggerPlugin,
    updateRoot,
    removeRoot,
    gatherComponents,
    pushSignalUpdate,
    setFocusedOwner,
    setFocusedOwnerDetails,
    focusedRootId,
    focusedId,
    pushComputationUpdate,
  }
})
export const {
  onUpdate,
  onForceUpdate,
  triggerUpdate,
  forceTriggerUpdate,
  enabled,
  gatherComponents,
  roots,
  setRoots,
  registerDebuggerPlugin,
  updateRoot,
  removeRoot,
  pushSignalUpdate,
  setFocusedOwner,
  setFocusedOwnerDetails,
  focusedRootId,
  focusedId,
  pushComputationUpdate,
} = exported
