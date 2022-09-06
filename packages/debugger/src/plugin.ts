import { Accessor, batch, createEffect, createSignal, untrack } from "solid-js"
import { createSimpleEmitter, Listen } from "@solid-primitives/event-bus"
import { omit } from "@solid-primitives/immutable"
import { createLazyMemo } from "@solid-primitives/memo"
import { createStaticStore } from "@solid-primitives/utils"
import { throttle } from "@solid-primitives/scheduled"
import {
  Mapped,
  Solid,
  RootsUpdates,
  NodeID,
  ComputationUpdate,
  SignalUpdate,
} from "@solid-devtools/shared/graph"
import { EncodedValue, encodeValue, ElementMap } from "@solid-devtools/shared/serialize"
import { createConsumers, untrackedCallback } from "@solid-devtools/shared/primitives"
import { createBatchedUpdateEmitter, createInternalRoot } from "./utils"
import { ComputationUpdateHandler } from "./walker"
import { walkSolidRoot } from "./roots"
import {
  clearOwnerObservers,
  collectOwnerDetails,
  encodeComponentProps,
  SignalUpdateHandler,
} from "./inspect"
import { makeSolidUpdateListener } from "./update"

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

export type SetInspectedOwner = (payload: { rootId: NodeID; nodeId: NodeID } | null) => void

export type InspectedState = Readonly<
  {
    signalMap: Record<NodeID, Solid.Signal>
    elementMap: ElementMap
  } & (
    | { id: null; rootId: null; owner: null; details: null }
    | { id: NodeID; rootId: NodeID; owner: Solid.Owner; details: Mapped.OwnerDetails }
  )
>

const getNullInspected = (): InspectedState => ({
  id: null,
  rootId: null,
  owner: null,
  details: null,
  signalMap: {},
  elementMap: new ElementMap(),
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

export type PluginData = {
  readonly triggerUpdate: VoidFunction
  readonly forceTriggerUpdate: VoidFunction
  readonly handleComputationUpdates: (listener: BatchComputationUpdatesHandler) => VoidFunction
  readonly handleSignalUpdates: (listener: BatchSignalUpdatesHandler) => VoidFunction
  readonly handlePropsUpdate: Listen<Mapped.Props>
  readonly roots: Accessor<Record<NodeID, SignaledRoot>>
  readonly serialisedRoots: Accessor<Record<NodeID, Mapped.Owner>>
  readonly rootsUpdates: Accessor<RootsUpdates>
  readonly components: Accessor<Record<NodeID, Mapped.Component[]>>
  readonly setInspectedOwner: SetInspectedOwner
  readonly inspected: InspectedState
  readonly setInspectedSignal: (id: NodeID, selected: boolean) => EncodedValue<boolean> | null
  readonly setInspectedProp: (key: NodeID, selected: boolean) => void
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
  // Inspected Owner details:
  //
  const [inspected, setInspected] = createStaticStore(getNullInspected())
  let lastInspectedOwner: Solid.Owner | null = null

  const inspectedSignals: Set<NodeID> = new Set()
  const inspectedProps: Set<string> = new Set()

  const [handleSignalUpdates, pushSignalUpdate] = createBatchedUpdateEmitter<SignalUpdate>()
  const signalUpdateHandler: SignalUpdateHandler = untrackedCallback((id, value) => {
    if (!enabled() || !inspected.id) return
    const isSelected = inspectedSignals.has(id)
    pushSignalUpdate({ id, value: encodeValue(value, isSelected, inspected.elementMap) })
  })

  const [handlePropsUpdate, emitPropsUpdate] = createSimpleEmitter<Mapped.Props>()

  const updateInspectedDetails = untrackedCallback(() => {
    const { owner, elementMap } = inspected
    if (!owner) return
    const { details, signalMap } = collectOwnerDetails(owner, {
      elementMap,
      signalUpdateHandler,
      inspectedProps,
    })
    setInspected({ details, signalMap })
  })
  const updateInspectedProps = untrackedCallback(() => {
    const { owner, elementMap } = inspected
    if (!owner) return
    const props = encodeComponentProps(owner, { inspectedProps, elementMap })
    props && emitPropsUpdate(props)
  })

  createEffect(() => {
    // make sure we clear the owner observers when the plugin is disabled
    if (!enabled()) lastInspectedOwner && clearOwnerObservers(lastInspectedOwner)
    // re-observe the owner when the plugin is enabled
    else updateInspectedDetails()
    createEffect(() => {
      // make sure we clear the owner observers when the owner changes
      const owner = inspected.owner
      if (lastInspectedOwner && lastInspectedOwner !== owner)
        clearOwnerObservers(lastInspectedOwner)
      lastInspectedOwner = owner

      // update the owner details whenever there is a change in solid's internals
      makeSolidUpdateListener(throttle(updateInspectedProps, 150))
    })
  })

  const setInspectedOwner: SetInspectedOwner = untrackedCallback(payload => {
    if (!payload) return setInspected(getNullInspected())
    const { rootId, nodeId } = payload
    if (inspected.id === nodeId) return

    const result = walkSolidRoot(rootId, nodeId)
    if (!result || !result.inspectedOwner) return setInspected(getNullInspected())

    const owner = result.inspectedOwner
    const elementMap = new ElementMap()
    inspectedProps.clear()
    inspectedSignals.clear()
    const { details, signalMap } = collectOwnerDetails(owner, {
      elementMap,
      signalUpdateHandler,
      inspectedProps,
    })

    setInspected({ id: nodeId, rootId, owner, details, signalMap, elementMap })
  })

  const setInspectedSignal: PluginData["setInspectedSignal"] = untrackedCallback((id, selected) => {
    const { signalMap, elementMap } = inspected
    const signal = signalMap[id] as Solid.Signal | undefined
    if (!signal) return null
    if (selected) inspectedSignals.add(id)
    else inspectedSignals.delete(id)
    return encodeValue(signal.value, selected, elementMap)
  })
  const setInspectedProp: PluginData["setInspectedProp"] = untrackedCallback((key, selected) => {
    if (selected) inspectedProps.add(key)
    else inspectedProps.delete(key)
    updateInspectedProps()
  })

  //
  // Computation updates:
  //
  const [handleComputationUpdates, _pushComputationUpdate] =
    createBatchedUpdateEmitter<ComputationUpdate>()
  const pushComputationUpdate: ComputationUpdateHandler = (rootId, id) => {
    _pushComputationUpdate({ rootId, id })
  }

  //
  // Components:
  //
  const components = createLazyMemo(() =>
    Object.entries(roots()).reduce<Record<NodeID, Mapped.Component[]>>((obj, [rootId, root]) => {
      obj[rootId] = root.components()
      return obj
    }, {}),
  )

  const pluginData: PluginData = {
    handleComputationUpdates,
    handleSignalUpdates,
    handlePropsUpdate,
    roots,
    serialisedRoots,
    rootsUpdates,
    components,
    triggerUpdate,
    forceTriggerUpdate,
    setInspectedOwner,
    inspected,
    setInspectedSignal,
    setInspectedProp,
  }
  function useDebugger(options: {
    enabled?: Accessor<boolean>
    gatherComponents?: Accessor<boolean>
  }): PluginData {
    const { enabled, gatherComponents } = options
    enabled && addDebuggerConsumer(enabled)
    gatherComponents && addGatherComponentsConsumer(gatherComponents)
    return pluginData
  }

  return {
    onUpdate,
    onForceUpdate,
    enabled,
    useDebugger,
    updateRoot,
    removeRoot,
    gatherComponents,
    pushComputationUpdate,
  }
})
export const {
  onUpdate,
  onForceUpdate,
  enabled,
  gatherComponents,
  useDebugger,
  updateRoot,
  removeRoot,
  pushComputationUpdate,
} = exported
