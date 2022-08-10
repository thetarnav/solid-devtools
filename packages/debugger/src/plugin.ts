import { Accessor, batch, createSignal, getOwner, runWithOwner, untrack } from "solid-js"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { omit, splice } from "@solid-primitives/immutable"
import { createLazyMemo } from "@solid-primitives/memo"
import {
  BatchUpdateListener,
  MappedComponent,
  MappedRoot,
  OwnerDetails,
  SolidOwner,
  MappedOwner,
  SerialisedTreeRoot,
} from "@solid-devtools/shared/graph"
import { makeBatchUpdateListener, SignalUpdateHandler } from "./batchUpdates"
import { createConsumers, createInternalRoot } from "./utils"
import { clearOwnerObservers, WalkerConfig } from "./walker"
import { forceRootUpdate } from "./roots"

export type SetFocusedOwner = (payload: { rootId: number; ownerId: number } | null) => void

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

export type FocusedState = Readonly<
  | { id: null; rootId: null; owner: null; updated: false; details: null }
  | { id: number; rootId: number; owner: null; updated: false; details: null }
  | { id: number; rootId: number; owner: SolidOwner; updated: boolean; details: OwnerDetails }
>

const nullFocusedState = {
  id: null,
  rootId: null,
  owner: null,
  updated: false,
  details: null,
} as const

const focusedExports = createInternalRoot(() => {
  const [state, setState] = createSignal<FocusedState>(nullFocusedState)

  const handleSignalUpdate: SignalUpdateHandler = ({ id, value, oldValue }) => {
    console.log("handleSignalUpdate", id, value, oldValue)
  }

  const setFocusedOwner: SetFocusedOwner = payload => {
    console.log("setFocusedOwner", payload)

    const { owner, id } = untrack(state)
    if (!payload) {
      // TODO: how to move this to the walker?
      if (owner) clearOwnerObservers(owner)
      setState(nullFocusedState)
    } else {
      if (id === payload.ownerId) return
      if (owner) clearOwnerObservers(owner)
      setState({
        id: payload.ownerId,
        rootId: payload.rootId,
        owner: null,
        updated: false,
        details: null,
      })
      forceRootUpdate(payload.rootId)
    }
  }

  const setFocusedOwnerDetails = (newOwner: SolidOwner | null, newDetails: OwnerDetails | null) => {
    if (newOwner && newDetails) {
      setState(prev => ({
        id: prev.id!,
        rootId: prev.rootId!,
        owner: newOwner,
        updated: prev.owner === newOwner,
        details: newDetails,
      }))
    } else setState(nullFocusedState)
  }

  const walkerConfig: Pick<WalkerConfig, "focusedID"> = {
    get focusedID() {
      return state().id
    },
  }

  const focusedRootId = () => state().rootId

  return {
    setFocusedOwner,
    focusedState: state,
    setFocusedOwnerDetails,
    focusedWalkerConfig: walkerConfig,
    focusedRootId,
    handleSignalUpdate,
  }
})
export const {
  setFocusedOwner,
  focusedState,
  setFocusedOwnerDetails,
  focusedWalkerConfig,
  focusedRootId,
  handleSignalUpdate,
} = focusedExports

export type SignaledRoot = {
  readonly id: number
  readonly tree: Accessor<MappedOwner>
  readonly components: Accessor<MappedComponent[]>
}

export type RootsUpdates = {
  readonly added: SerialisedTreeRoot[]
  readonly removed: number[]
  readonly updated: SerialisedTreeRoot[]
}

export type _SignaledRoot = {
  id: number
  tree: Accessor<MappedOwner>
  setTree: (tree: MappedOwner) => void
  components: Accessor<MappedComponent[]>
  setComponents: (components: MappedComponent[]) => void
}

export type PluginFactory = (data: {
  triggerUpdate: VoidFunction
  forceTriggerUpdate: VoidFunction
  makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
  roots: Accessor<Record<number, SignaledRoot>>
  serialisedRoots: Accessor<Record<number, MappedOwner>>
  rootsUpdates: Accessor<RootsUpdates>
  components: Accessor<MappedComponent[]>
  setFocusedOwner: SetFocusedOwner
  focusedState: Accessor<FocusedState>
}) => {
  enabled?: Accessor<boolean>
  observeComputations?: Accessor<boolean>
  gatherComponents?: Accessor<boolean>
}

const pluginExports = createInternalRoot(() => {
  const owner = getOwner()!

  /** throttled global update */
  const [onUpdate, triggerUpdate] = createSimpleEmitter()
  /** forced — immediate global update */
  const [onForceUpdate, forceTriggerUpdate] = createSimpleEmitter()

  // Consumers:
  const [enabled, addDebuggerConsumer] = createConsumers()
  const [gatherComponents, addGatherComponentsConsumer] = createConsumers()
  const [observeComputations, addObserveComputationsConsumer] = createConsumers()

  // Roots:
  const [roots, setRoots] = createSignal<Record<number, _SignaledRoot>>({})

  const serialisedRoots = createLazyMemo<Record<number, MappedOwner>>(() => {
    const serialisedRoots: Record<number, MappedOwner> = {}
    for (const [id, root] of Object.entries(roots())) {
      serialisedRoots[+id] = root.tree()
    }
    return serialisedRoots
  })

  let addedIds: number[] = []
  let updatedIds: number[] = []
  let removedIds: number[] = []
  const rootsUpdates = createLazyMemo<RootsUpdates>(() => {
    updatedIds = updatedIds.filter(id => !removedIds.includes(id))
    addedIds = addedIds.filter(id => !removedIds.includes(id) && !updatedIds.includes(id))

    const sRoots = serialisedRoots()
    const added: RootsUpdates["added"] = addedIds.map(id => ({ id, tree: sRoots[id] }))
    const updated: RootsUpdates["updated"] = updatedIds.map(id => ({ id, tree: sRoots[id] }))
    const removed: RootsUpdates["removed"] = removedIds

    addedIds = []
    updatedIds = []
    removedIds = []

    return { added, updated, removed }
  })

  function removeRoot(rootId: number) {
    removedIds.push(rootId)
    setRoots(map => omit(map, rootId))
  }

  function updateRoot(newRoot: MappedRoot): void {
    const rootMap = untrack(roots)
    const rootId = newRoot.id
    const root = rootMap[rootId]
    if (root)
      batch(() => {
        updatedIds.push(rootId)
        root.setTree(newRoot.tree)
        root.setComponents(newRoot.components)
      })
    else {
      const [tree, setTree] = createSignal(newRoot.tree)
      const [components, setComponents] = createSignal(newRoot.components)
      addedIds.push(rootId)
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

  // Components:
  const components = createLazyMemo<MappedComponent[]>(() =>
    Object.values(roots()).reduce((arr: MappedComponent[], root) => {
      arr.push.apply(arr, root.components())
      return arr
    }, []),
  )

  const walkerConfig: Pick<WalkerConfig, "observeComputations" | "gatherComponents"> = {
    get observeComputations() {
      return observeComputations()
    },
    get gatherComponents() {
      return gatherComponents()
    },
  }

  function registerDebuggerPlugin(factory: PluginFactory) {
    runWithOwner(owner, () => {
      const { enabled, gatherComponents, observeComputations } = factory({
        makeBatchUpdateListener,
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
    walkerConfig,
    roots,
    setRoots,
    registerDebuggerPlugin,
    updateRoot,
    removeRoot,
  }
})
export const {
  onUpdate,
  onForceUpdate,
  triggerUpdate,
  forceTriggerUpdate,
  enabled,
  walkerConfig,
  roots,
  setRoots,
  registerDebuggerPlugin,
  updateRoot,
  removeRoot,
} = pluginExports
