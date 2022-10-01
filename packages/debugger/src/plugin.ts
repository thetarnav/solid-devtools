import { Accessor, createEffect, createSignal, untrack } from "solid-js"
import { createSimpleEmitter, Listen } from "@solid-primitives/event-bus"
import { throttle } from "@solid-primitives/scheduled"
import {
  Mapped,
  Solid,
  RootsUpdates,
  NodeID,
  ComputationUpdate,
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
  encodeOwnerValue,
  SignalUpdateHandler,
  ValueUpdateHandler,
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

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void

export type PluginData = {
  readonly triggerUpdate: VoidFunction
  readonly forceTriggerUpdate: VoidFunction
  readonly handleComputationUpdates: (listener: BatchComputationUpdatesHandler) => VoidFunction
  readonly handleSignalUpdates: (
    listener: (payload: { id: NodeID; value: EncodedValue<boolean> }[]) => void,
  ) => VoidFunction
  readonly handlePropsUpdate: Listen<Mapped.Props>
  readonly handleValueUpdate: Listen<EncodedValue<boolean>>
  readonly handleStructureUpdates: Listen<RootsUpdates>
  readonly components: Accessor<Record<NodeID, Mapped.ResolvedComponent[]>>
  readonly findComponent: (rootId: NodeID, nodeId: NodeID) => Mapped.ResolvedComponent | undefined
  readonly inspectedDetails: Accessor<Mapped.OwnerDetails | null>
  readonly setInspectedOwner: (payload: { rootId: NodeID; nodeId: NodeID } | null) => void
  readonly getElementById: (id: NodeID) => HTMLElement | undefined
  readonly setInspectedSignal: (id: NodeID, selected: boolean) => EncodedValue<boolean> | null
  readonly setInspectedProp: (key: NodeID, selected: boolean) => void
  readonly setInspectedValue: (selected: boolean) => EncodedValue<boolean> | null
}

type RootUpdate = { removed: NodeID } | { updated: Mapped.Root }

const [handleStructureUpdates, pushStructureUpdate] = (() => {
  const [handleStructureUpdate, emitStructureUpdate] = createSimpleEmitter<RootsUpdates>()
  const updates: Mapped.Root[] = []
  const removedIds = new Set<NodeID>()
  const trigger = throttle(() => {
    const updated: Record<NodeID, Mapped.Root> = {}
    for (let i = updates.length - 1; i >= 0; i--) {
      const update = updates[i]
      const { id } = update
      if (!removedIds.has(id) && !updated[id]) updated[id] = update
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

export const debuggerConfig = {
  gatherComponents: false,
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

  //
  // Components:
  //
  const [components, setComponents] = createSignal<Record<NodeID, Mapped.ResolvedComponent[]>>({})

  const findComponent: PluginData["findComponent"] = (rootId, nodeId) => {
    const componentsList = components()[rootId] as Mapped.ResolvedComponent[] | undefined
    if (!componentsList) return
    for (const c of componentsList) {
      if (c.id === nodeId) return c
    }
  }

  function removeRoot(rootId: NodeID) {
    setComponents(prev => {
      const copy = Object.assign({}, prev)
      delete copy[rootId]
      return copy
    })
    pushStructureUpdate({ removed: rootId })
  }
  function updateRoot(newRoot: Mapped.Root, newComponents: Mapped.ResolvedComponent[]): void {
    setComponents(prev => Object.assign(prev, { [newRoot.id]: newComponents }))
    pushStructureUpdate({ updated: newRoot })
  }

  //
  // Inspected Owner details:
  //
  const inspected = {
    elementMap: new ElementMap(),
    signalMap: {} as Record<NodeID, Solid.Signal>,
    owner: null as Solid.Owner | null,
    signals: new Set<NodeID>(),
    props: new Set<string>(),
    value: false,
  }

  const [details, setDetails] = createSignal<Mapped.OwnerDetails | null>(null)

  const getElementById = (id: NodeID): HTMLElement | undefined => inspected.elementMap.get(id)

  const [handleSignalUpdates, pushSignalUpdate] = createBatchedUpdateEmitter<{
    id: NodeID
    value: EncodedValue<boolean>
  }>()
  const onSignalUpdate: SignalUpdateHandler = untrackedCallback((id, value) => {
    if (!enabled() || !inspected.owner) return
    const isSelected = inspected.signals.has(id)
    pushSignalUpdate({ id, value: encodeValue(value, isSelected, inspected.elementMap) })
  })

  const [handleValueUpdate, emitValueUpdate] = createSimpleEmitter<EncodedValue<boolean>>()
  const onValueUpdate: ValueUpdateHandler = throttle(value => {
    if (!enabled() || !inspected.owner) return
    emitValueUpdate(encodeValue(value, inspected.value, inspected.elementMap))
  })

  const setInspectedDetails = untrackedCallback((owner: Solid.Owner) => {
    inspected.owner && clearOwnerObservers(inspected.owner)
    inspected.props.clear()
    inspected.signals.clear()
    inspected.owner = owner
    inspected.value = false
    const result = collectOwnerDetails(owner, { onSignalUpdate, onValueUpdate })
    setDetails(result.details)
    inspected.signalMap = result.signalMap
    inspected.elementMap = result.elementMap
  })
  const clearInspectedDetails = () => {
    inspected.owner && clearOwnerObservers(inspected.owner)
    inspected.owner = null
    setDetails(null)
    inspected.signals.clear()
    inspected.props.clear()
    inspected.value = false
  }

  const [handlePropsUpdate, emitPropsUpdate] = createSimpleEmitter<Mapped.Props>()

  function updateInspectedProps() {
    if (!inspected.owner) return
    const props = encodeComponentProps(inspected.owner, {
      inspectedProps: inspected.props,
      elementMap: inspected.elementMap,
    })
    props && emitPropsUpdate(props)
  }

  createEffect(() => {
    // make sure we clear the owner observers when the plugin is disabled
    if (!enabled()) inspected.owner && clearOwnerObservers(inspected.owner)
    // re-observe the owner when the plugin is enabled
    else inspected.owner && setInspectedDetails(inspected.owner)

    // update the owner details whenever there is a change in solid's internals
    makeSolidUpdateListener(throttle(updateInspectedProps, 150))
  })

  const setInspectedOwner: PluginData["setInspectedOwner"] = payload => {
    if (!payload) return clearInspectedDetails()
    const { rootId, nodeId } = payload

    const walkResult = walkSolidRoot(rootId, nodeId)
    if (!walkResult || !walkResult.inspectedOwner) return clearInspectedDetails()

    setInspectedDetails(walkResult.inspectedOwner)
  }

  const setInspectedSignal: PluginData["setInspectedSignal"] = (id, selected) => {
    const signal = inspected.signalMap[id] as Solid.Signal | undefined
    if (!signal) return null
    if (selected) inspected.signals.add(id)
    else inspected.signals.delete(id)
    return untrack(() => encodeValue(signal.value, selected, inspected.elementMap))
  }
  const setInspectedProp: PluginData["setInspectedProp"] = (key, selected) => {
    if (selected) inspected.props.add(key)
    else inspected.props.delete(key)
    updateInspectedProps()
  }
  const setInspectedValue: PluginData["setInspectedValue"] = selected => {
    if (!inspected.owner) return null
    return encodeOwnerValue(inspected.owner, (inspected.value = selected), inspected.elementMap)
  }

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
    handleValueUpdate,
    handleStructureUpdates,
    components,
    findComponent,
    triggerUpdate,
    forceTriggerUpdate,
    inspectedDetails: details,
    setInspectedOwner,
    setInspectedSignal,
    setInspectedProp,
    setInspectedValue,
    getElementById,
  }
  function useDebugger(options: {
    enabled?: Accessor<boolean>
    gatherComponents?: boolean
  }): PluginData {
    const { enabled, gatherComponents } = options
    enabled && addDebuggerConsumer(enabled)
    if (gatherComponents) debuggerConfig.gatherComponents = true
    return pluginData
  }

  return {
    onUpdate,
    onForceUpdate,
    enabled,
    useDebugger,
    updateRoot,
    removeRoot,
    pushComputationUpdate,
  }
})
export const {
  onUpdate,
  onForceUpdate,
  enabled,
  useDebugger,
  updateRoot,
  removeRoot,
  pushComputationUpdate,
} = exported
