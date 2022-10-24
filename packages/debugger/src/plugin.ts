import { Accessor, batch, createMemo, createSignal } from 'solid-js'
import {
  createEventHub,
  createSimpleEmitter,
  EventBus,
  EventHub,
} from '@solid-primitives/event-bus'
import { throttle } from '@solid-primitives/scheduled'
import {
  Mapped,
  RootsUpdates,
  NodeID,
  ComputationUpdate,
  EncodedValue,
} from '@solid-devtools/shared/graph'
import { atom } from '@solid-devtools/shared/primitives'
import { createBatchedUpdateEmitter, createInternalRoot } from './utils'
import { ComputationUpdateHandler } from './walker'
import { createLocator } from './locator'
import { createInspector } from './inspector'

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void

type DebuggerEventHubMessages = {
  ComputationUpdates: ComputationUpdate[]
  SignalUpdates: { id: NodeID; value: EncodedValue<boolean> }[]
  PropsUpdate: Mapped.Props
  ValueUpdate: { value: EncodedValue<boolean>; update: boolean }
  StructureUpdates: RootsUpdates
  InspectedNodeDetails: Mapped.OwnerDetails
}
export type DebuggerEventHub = EventHub<{
  [K in keyof DebuggerEventHubMessages]: EventBus<DebuggerEventHubMessages[K]>
}>

export default createInternalRoot(() => {
  /** throttled global update */
  const [onUpdate, triggerUpdate] = createSimpleEmitter()
  /** forced — immediate global update */
  const [onForceUpdate, forceTriggerUpdate] = createSimpleEmitter()

  const eventHub: DebuggerEventHub = createEventHub(bus => ({
    ComputationUpdates: bus(),
    SignalUpdates: bus(),
    PropsUpdate: bus(),
    ValueUpdate: bus(),
    StructureUpdates: bus(),
    InspectedNodeDetails: bus(),
  }))

  //
  // Debugger Enabled
  //
  const [debuggerEnabled, toggleDebugger, addLocatorModeEnabledSignal] = (() => {
    const locatorModeEnabledSignal = atom<Accessor<boolean>>()
    const debuggerEnabled = atom(false)
    const combinedEnabled = createMemo(() => debuggerEnabled() || !!locatorModeEnabledSignal()?.())

    function toggleDebugger(state?: boolean) {
      batch(() => {
        const newState = debuggerEnabled(p => state ?? !p)
        if (!newState) {
          setComponents({})
          locator.togglePluginLocatorMode(false)
        }
      })
    }

    function addLocatorModeEnabledSignal(signal: Accessor<boolean>) {
      locatorModeEnabledSignal(() => signal)
    }

    return [combinedEnabled, toggleDebugger, addLocatorModeEnabledSignal]
  })()

  //
  // Components:
  //
  const [components, setComponents] = createSignal<Record<NodeID, Mapped.ResolvedComponent[]>>({})

  function findComponent(rootId: NodeID, nodeId: NodeID) {
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
  // Structure updates:
  //
  const pushStructureUpdate = (() => {
    const updates: Mapped.Root[] = []
    const removedIds = new Set<NodeID>()
    const trigger = throttle(() => {
      const updated: Record<NodeID, Mapped.Root> = {}
      for (let i = updates.length - 1; i >= 0; i--) {
        const update = updates[i]
        const { id } = update
        if (!removedIds.has(id) && !updated[id]) updated[id] = update
      }
      eventHub.emit('StructureUpdates', { updated, removed: [...removedIds] })
      updates.length = 0
      removedIds.clear()
    }, 50)
    const pushStructureUpdate = (update: { removed: NodeID } | { updated: Mapped.Root }) => {
      if ('removed' in update) removedIds.add(update.removed)
      else if (removedIds.has(update.updated.id)) return
      else updates.push(update.updated)
      trigger()
    }
    return pushStructureUpdate
  })()

  //
  // Computation updates:
  //
  const _pushComputationUpdate = createBatchedUpdateEmitter<ComputationUpdate>(updates =>
    eventHub.emit('ComputationUpdates', updates),
  )
  const pushComputationUpdate: ComputationUpdateHandler = (rootId, id) => {
    _pushComputationUpdate({ rootId, id })
  }

  //
  // Inspected Owner details:
  //
  const inspector = createInspector({
    eventHub,
    debuggerEnabled,
  })

  //
  // Locator
  //
  const locator = createLocator({
    components,
    debuggerEnabled,
    findComponent,
    getElementById: inspector.getElementById,
    addLocatorModeEnabledSignal,
  })

  /**
   * Used for connecting debugger to devtools
   */
  function useDebugger() {
    return {
      listenTo: eventHub.on,
      enabled: debuggerEnabled,
      toggleEnabled: toggleDebugger,
      triggerUpdate,
      forceTriggerUpdate,
      inspector: {
        setInspectedNode: inspector.setInspectedNode,
        setInspectedSignal: inspector.setInspectedSignal,
        setInspectedProp: inspector.setInspectedProp,
        setInspectedValue: inspector.setInspectedValue,
      },
      locator: {
        toggleEnabled: locator.togglePluginLocatorMode,
        enabledByDebugger: locator.enabledByDebugger,
        addClickInterceptor: locator.addClickInterceptor,
        setHighlightTarget: locator.setPluginHighlightTarget,
        onHoveredComponent: locator.onDebuggerHoveredComponentChange,
      },
    }
  }

  return {
    onUpdate,
    onForceUpdate,
    enabled: debuggerEnabled,
    useDebugger,
    updateRoot,
    removeRoot,
    pushComputationUpdate,
    useLocator: locator.useLocator,
  }
})
