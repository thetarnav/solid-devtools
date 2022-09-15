import { Accessor, createEffect, createSignal } from "solid-js"
import { createSimpleEmitter, Listen } from "@solid-primitives/event-bus"
import { omit } from "@solid-primitives/immutable"
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

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void
export type BatchSignalUpdatesHandler = (payload: SignalUpdate[]) => void

export type PluginData = {
  readonly triggerUpdate: VoidFunction
  readonly forceTriggerUpdate: VoidFunction
  readonly handleComputationUpdates: (listener: BatchComputationUpdatesHandler) => VoidFunction
  readonly handleSignalUpdates: (listener: BatchSignalUpdatesHandler) => VoidFunction
  readonly handlePropsUpdate: Listen<Mapped.Props>
  readonly handleStructureUpdates: Listen<RootsUpdates>
  readonly components: Accessor<Record<NodeID, Mapped.Component[]>>
  readonly setInspectedOwner: SetInspectedOwner
  readonly inspected: InspectedState
  readonly setInspectedSignal: (id: NodeID, selected: boolean) => EncodedValue<boolean> | null
  readonly setInspectedProp: (key: NodeID, selected: boolean) => void
}

type RootUpdate = { removed: NodeID } | { updated: Mapped.Root }

const [handleStructureUpdates, pushStructureUpdate] = (() => {
  const [handleStructureUpdate, emitStructureUpdate] = createSimpleEmitter<RootsUpdates>()
  const updates: Mapped.Root[] = []
  const removedIds = new Set<NodeID>()
  const trigger = throttle(() => {
    const updated: Mapped.Root[] = []
    const updatedIds = new Set<NodeID>()
    for (let i = updates.length - 1; i >= 0; i--) {
      const update = updates[i]
      const { id } = update
      if (!removedIds.has(id) && !updatedIds.has(id)) {
        updated.push(update)
        updatedIds.add(id)
      }
    }
    emitStructureUpdate({ updated, removed: [...removedIds] })
    updates.length = 0
    removedIds.clear()
  }, 50)
  const pushStructureUpdate = (update: RootUpdate) => {
    if ("removed" in update) removedIds.add(update.removed)
    else if (removedIds.has(update.updated.id)) return
    else updates.push(update.updated)
    trigger()
  }
  return [handleStructureUpdate, pushStructureUpdate]
})()

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
  // Components:
  //
  const [components, setComponents] = createSignal<Record<NodeID, Mapped.Component[]>>({})

  function removeRoot(rootId: NodeID) {
    setComponents(omit(rootId))
    pushStructureUpdate({ removed: rootId })
  }
  function updateRoot(newRoot: Mapped.Root, newComponents: Mapped.Component[]): void {
    setComponents(prev => Object.assign(prev, { [newRoot.id]: newComponents }))
    pushStructureUpdate({ updated: newRoot })
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

  const pluginData: PluginData = {
    handleComputationUpdates,
    handleSignalUpdates,
    handlePropsUpdate,
    handleStructureUpdates,
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
