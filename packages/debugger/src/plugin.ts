import { Accessor, createSignal, getOwner, runWithOwner, untrack } from "solid-js"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { push, splice } from "@solid-primitives/immutable"
import { createLazyMemo } from "@solid-primitives/memo"
import {
  BatchUpdateListener,
  MappedComponent,
  MappedRoot,
  SerialisedTreeRoot,
  OwnerDetails,
  SolidOwner,
} from "@solid-devtools/shared/graph"
import { makeBatchUpdateListener, SignalUpdateHandler } from "./batchUpdates"
import { createConsumers, createInternalRoot } from "./utils"
import { clearOwnerSignalsObservers, WalkerConfig } from "./walker"
import { forceRootUpdate } from "./roots"

export type SetFocusedOwner = (payload: { rootId: number; ownerId: number } | null) => void

/*
DETAILS:

- type of the node
- breadcrumbs - mini path to the node
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

type FocusedState = Readonly<
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
      if (owner) clearOwnerSignalsObservers(owner)
      setState(nullFocusedState)
    } else {
      if (id === payload.ownerId) return
      if (owner) clearOwnerSignalsObservers(owner)
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

export type PluginFactory = (data: {
  triggerUpdate: VoidFunction
  forceTriggerUpdate: VoidFunction
  makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
  roots: Accessor<MappedRoot[]>
  components: Accessor<MappedComponent[]>
  serialisedRoots: Accessor<SerialisedTreeRoot[]>
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

  const [enabled, addDebuggerConsumer] = createConsumers()
  const [gatherComponents, addGatherComponentsConsumer] = createConsumers()
  const [observeComputations, addObserveComputationsConsumer] = createConsumers()

  const [roots, setRoots] = createSignal<MappedRoot[]>([])

  const components = createLazyMemo<MappedComponent[]>(() =>
    roots().reduce((arr: MappedComponent[], root) => {
      arr.push.apply(arr, root.components)
      return arr
    }, []),
  )

  const serialisedRoots = createLazyMemo<SerialisedTreeRoot[]>(() =>
    roots().map(root => ({
      id: root.id,
      tree: root.tree,
    })),
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
        components,
        triggerUpdate,
        forceTriggerUpdate,
        serialisedRoots,
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
    updateRoot(root: MappedRoot): void {
      setRoots(arr => {
        const index = arr.findIndex(o => o.id === root.id)
        return index !== -1 ? splice(arr, index, 1, root) : push(arr, root)
      })
    },
    removeRoot(rootId: number): void {
      setRoots(arr => {
        const index = arr.findIndex(o => o.id === rootId)
        return splice(arr, index, 1)
      })
    },
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
