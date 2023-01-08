import { createEventHub, EventBus, EventHub } from '@solid-primitives/event-bus'
import { Accessor, createMemo, createSignal } from 'solid-js'
import { createInspector, InspectorUpdate } from '../inspector'
import { createLocator } from '../locator'
import { createStructure, StructureUpdates } from '../structure'
import { createInternalRoot } from './roots'
import { ComputationUpdate, Mapped } from './types'
import { createBatchedUpdateEmitter } from './utils'

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void

type DebuggerEventHubMessages = {
  ComputationUpdates: ComputationUpdate[]
  StructureUpdates: StructureUpdates
  InspectorUpdate: InspectorUpdate[]
  InspectedNodeDetails: Mapped.OwnerDetails
}
export type DebuggerEventHub = EventHub<{
  [K in keyof DebuggerEventHubMessages]: EventBus<DebuggerEventHubMessages[K]>
}>

const plugin = createInternalRoot(() => {
  const eventHub: DebuggerEventHub = createEventHub(bus => ({
    ComputationUpdates: bus(),
    StructureUpdates: bus(),
    InspectorUpdate: bus(),
    InspectedNodeDetails: bus(),
  }))

  //
  // Debugger Enabled
  //
  const [_structureEnabled, setStructureEnabled] = createSignal(false)
  const [debuggerEnabled, setDebuggerEnabled] = createSignal(false)
  const [locatorEnabledSignal, setLocatorEnabledSignal] = createSignal<Accessor<boolean>>()

  const structureEnabled = createMemo(
    () => (_structureEnabled() || !!locatorEnabledSignal()?.()) && debuggerEnabled(),
  )

  //
  // Structure & Computation updates:
  //
  const pushComputationUpdate = createBatchedUpdateEmitter<ComputationUpdate>(updates => {
    eventHub.emit('ComputationUpdates', updates)
  })

  const structure = createStructure({
    onStructureUpdate(updated, removedIds) {
      eventHub.emit('StructureUpdates', { updated, removed: [...removedIds] })
    },
    onComputationUpdates(rootId, id) {
      pushComputationUpdate({ rootId, id })
    },
    structureEnabled,
  })

  //
  // Inspected Owner details:
  //
  const inspector = createInspector(debuggerEnabled, { eventHub })

  //
  // Locator
  //
  const locator = createLocator({
    debuggerEnabled,
    getElementById: inspector.getElementById,
    setLocatorEnabledSignal: signal => setLocatorEnabledSignal(() => signal),
  })

  // Opens the source code of the inspected component
  function openInspectedNodeLocation() {
    const details = inspector.getLastDetails()
    if (!details || !details.location) return
    locator.openElementSourceCode(details.location, details.name)
  }

  /**
   * Used for connecting debugger to devtools
   */
  function useDebugger() {
    return {
      enabled: debuggerEnabled,
      toggleEnabled: (enabled: boolean) => void setDebuggerEnabled(enabled),
      listenTo: eventHub.on,
      openInspectedNodeLocation,
      structure: {
        enabled: structureEnabled,
        toggleEnabled: (enabled: boolean) => void setStructureEnabled(enabled),
        setTreeWalkerMode: structure.setTreeWalkerMode,
        triggerUpdate: structure.updateAllRoots,
        forceTriggerUpdate: structure.forceUpdateAllRoots,
      },
      inspector: {
        setInspectedNode: inspector.setInspectedNode,
        toggleValueNode: inspector.toggleValueNode,
      },
      locator: {
        toggleEnabled: locator.togglePluginLocatorMode,
        enabledByDebugger: locator.enabledByDebugger,
        addClickInterceptor: locator.addClickInterceptor,
        setHighlightTarget: locator.setDevtoolsHighlightTarget,
        onHoveredComponent: locator.onDebuggerHoveredComponentChange,
      },
    }
  }

  return {
    useDebugger,
    useLocator: locator.useLocator,
  }
})

export const { useDebugger, useLocator } = plugin
