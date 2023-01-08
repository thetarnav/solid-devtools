import { defer } from '@solid-devtools/shared/primitives'
import {
  createEventHub,
  createSimpleEmitter,
  EventBus,
  EventHub,
} from '@solid-primitives/event-bus'
import { Accessor, createEffect, createMemo, createSignal } from 'solid-js'
import { createDependencyGraph } from '../dependency'
import { createInspector, InspectorUpdate } from '../inspector'
import { createLocator } from '../locator'
import { createStructure, StructureUpdates } from '../structure'
import { createInternalRoot, findOwnerById } from './roots'
import { ComputationUpdate, Mapped, NodeID, Solid } from './types'
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

export type InspectedNode = {
  readonly rootId: NodeID
  readonly owner: Solid.Owner | null
  readonly signal: Solid.Signal | null
} | null

export type SetInspectedNodeData = null | { rootId: NodeID; nodeId: NodeID }

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
  const [_debuggerEnabled, setDebuggerEnabled] = createSignal(false)
  const [locatorEnabledSignal, setLocatorEnabledSignal] = createSignal<Accessor<boolean>>()
  const [_dgraphEnabled, setDgraphEnabled] = createSignal(false)

  // The debugger can be enabled by devtools or by the locator
  const debuggerEnabled = createMemo(() => _debuggerEnabled() || !!locatorEnabledSignal()?.())

  const structureEnabled = createMemo(
    () => (_structureEnabled() || !!locatorEnabledSignal()?.()) && debuggerEnabled(),
  )

  const dgraphEnabled = createMemo(() => _dgraphEnabled() && debuggerEnabled())

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

  // Current inspected node is shared between modules
  let inspectedNode: InspectedNode = null
  const [listenToInspectedNodeChange, emitNodeChange] = createSimpleEmitter<InspectedNode>()

  function setInspectedNode(data: SetInspectedNodeData): void {
    if (!data) inspectedNode = null
    else {
      const owner = findOwnerById(data.rootId, data.nodeId)
      if (!owner) inspectedNode = null
      else inspectedNode = { rootId: data.rootId, owner, signal: null }
    }
    emitNodeChange(inspectedNode)
  }

  createEffect(
    defer(debuggerEnabled, enabled => {
      if (!enabled) setInspectedNode(null)
    }),
  )

  //
  // Inspected Owner details:
  //
  const inspector = createInspector({
    eventHub,
    enabled: debuggerEnabled,
    listenToInspectedNodeChange,
  })

  const dgraph = createDependencyGraph({ enabled: dgraphEnabled, listenToInspectedNodeChange })

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
      setInspectedNode,
      structure: {
        enabled: structureEnabled,
        toggleEnabled: (enabled: boolean) => void setStructureEnabled(enabled),
        setTreeWalkerMode: structure.setTreeWalkerMode,
        triggerUpdate: structure.updateAllRoots,
        forceTriggerUpdate: structure.forceUpdateAllRoots,
      },
      inspector: {
        toggleValueNode: inspector.toggleValueNode,
      },
      locator: {
        toggleEnabled: locator.togglePluginLocatorMode,
        enabledByDebugger: locator.enabledByDebugger,
        addClickInterceptor: locator.addClickInterceptor,
        setHighlightTarget: locator.setDevtoolsHighlightTarget,
        onHoveredComponent: locator.onDebuggerHoveredComponentChange,
      },
      dgraph: {
        enabled: dgraphEnabled,
        toggleEnabled: (enabled: boolean) => void setDgraphEnabled(enabled),
      },
    }
  }

  return {
    useDebugger,
    useLocator: locator.useLocator,
  }
})

export const { useDebugger, useLocator } = plugin
