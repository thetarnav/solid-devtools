import { defer } from '@solid-devtools/shared/primitives'
import { createEventHub, createSimpleEmitter } from '@solid-primitives/event-bus'
import { createStaticStore } from '@solid-primitives/utils'
import { batch, createComputed, createEffect, createMemo } from 'solid-js'
import { createDependencyGraph, DGraphUpdate } from '../dependency'
import { createInspector, InspectorUpdate } from '../inspector'
import { createLocator } from '../locator'
import { createStructure, StructureUpdates } from '../structure'
import { DebuggerModule, DEFAULT_MAIN_VIEW, DevtoolsMainView } from './constants'
import { getObjectById, ObjectType } from './id'
import { createInternalRoot } from './roots'
import { Mapped, NodeID, Solid } from './types'
import { createBatchedUpdateEmitter } from './utils'

export type InspectedState = {
  readonly owner: Solid.Owner | null
  readonly signal: Solid.Signal | null
}

function createDebuggerEventHub() {
  return createEventHub($ => ({
    NodeUpdates: $<NodeID[]>(),
    StructureUpdates: $<StructureUpdates>(),
    InspectorUpdate: $<InspectorUpdate[]>(),
    InspectedNodeDetails: $<Mapped.OwnerDetails>(),
    DgraphUpdate: $<DGraphUpdate>(),
    DebuggerDisabled: $<void>(),
  }))
}
export type DebuggerEventHub = ReturnType<typeof createDebuggerEventHub>

const plugin = createInternalRoot(() => {
  const eventHub = createDebuggerEventHub()

  //
  // Debugger Enabled
  //
  const [modules, toggleModules] = createStaticStore({
    debugger: false,
    locator: false,
    dgraph: false,
    locatorKeyPressSignal: (): boolean => false,
  })

  // The debugger can be enabled by devtools or by the locator
  const debuggerEnabled = createMemo(() => modules.debugger || modules.locatorKeyPressSignal())
  const dgraphEnabled = createMemo(() => modules.dgraph && debuggerEnabled())
  // locator is enabled if debugger is enabled, and user pressed the key to activate it, or the plugin activated it
  const locatorEnabled = createMemo(
    () => (modules.locatorKeyPressSignal() || modules.locator) && debuggerEnabled(),
  )

  createEffect(() => {
    if (!debuggerEnabled()) eventHub.DebuggerDisabled.emit()
  })

  //
  // Current Open VIEW (currently not used)
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let currentView: DevtoolsMainView = DEFAULT_MAIN_VIEW
  const [listenToViewChange, emitViewChange] = createSimpleEmitter<DevtoolsMainView>()

  function setView(view: DevtoolsMainView) {
    batch(() => {
      // setStructureEnabled(view === DevtoolsMainView.Structure)
      // setDgraphEnabled(view === DevtoolsMainView.Dgraph)
      emitViewChange((currentView = view))
    })
  }

  //
  // Enabled Modules
  //
  function toggleModule(data: { module: DebuggerModule; enabled: boolean }): void {
    switch (data.module) {
      case DebuggerModule.Structure:
        // * Structure is always enabled
        break
      case DebuggerModule.Dgraph:
        toggleModules('dgraph', data.enabled)
        break
      case DebuggerModule.Locator:
        toggleModules('locator', data.enabled)
        break
    }
  }

  //
  // Inspected Node
  //

  // Current inspected node is shared between modules
  let inspectedState: InspectedState = { owner: null, signal: null }
  const [listenToInspectedState, emitInspectedStateChange] = createSimpleEmitter<InspectedState>()

  createComputed(
    defer(debuggerEnabled, enabled => {
      if (!enabled) emitInspectedStateChange((inspectedState = { owner: null, signal: null }))
    }),
  )

  /** Check if the inspected node doesn't need to change (treeview mode changed or sth) */
  function updateInspectedNode() {
    if (!inspectedState.owner) return
    const closest = structure.getClosestIncludedOwner(inspectedState.owner)
    if (closest && closest === inspectedState.owner) return

    emitInspectedStateChange((inspectedState = { owner: closest, signal: null }))
  }

  function setInspectedNode(
    data: {
      ownerId: NodeID | null
      signalId: NodeID | null
    } | null,
  ): void {
    const { ownerId, signalId } = data ?? {}
    const owner = ownerId && getObjectById(ownerId, ObjectType.Owner)
    const signal = signalId && getObjectById(signalId, ObjectType.Signal)
    emitInspectedStateChange((inspectedState = { owner: owner ?? null, signal: signal ?? null }))
  }

  //
  // Structure & Computation updates:
  //
  const pushNodeUpdate = createBatchedUpdateEmitter<NodeID>(updates => {
    eventHub.emit('NodeUpdates', updates)
  })

  const structure = createStructure({
    onStructureUpdate(updates) {
      eventHub.emit('StructureUpdates', updates)
      updateInspectedNode()
    },
    onNodeUpdate: pushNodeUpdate,
    enabled: debuggerEnabled,
    listenToViewChange,
  })

  //
  // Inspected Owner details:
  //
  const inspector = createInspector({
    eventHub,
    enabled: debuggerEnabled,
    listenToInspectedNodeChange: listenToInspectedState,
  })

  //
  // Dependency Graph
  //

  createDependencyGraph({
    enabled: dgraphEnabled,
    listenToInspectedStateChange: listenToInspectedState,
    listenToViewChange,
    emitDependencyGraph: graph => eventHub.emit('DgraphUpdate', graph),
    onNodeUpdate: pushNodeUpdate,
  })

  //
  // Locator
  //
  const locator = createLocator({
    eventHub,
    locatorEnabled,
    setLocatorEnabledSignal: signal => toggleModules('locatorKeyPressSignal', () => signal),
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
      toggleEnabled: (enabled: boolean) => void toggleModules('debugger', enabled),
      listenTo: eventHub.on,
      openInspectedNodeLocation,
      setInspectedNode,
      setView,
      toggleModule,
      structure: {
        setTreeWalkerMode: structure.setTreeWalkerMode,
        triggerUpdate: structure.updateAllRoots,
        forceTriggerUpdate: structure.forceUpdateAllRoots,
      },
      inspector: {
        toggleValueNode: inspector.toggleValueNode,
      },
      locator: {
        enabledByDebugger: modules.locatorKeyPressSignal,
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

export type ToggleModuleData = Parameters<ReturnType<typeof plugin.useDebugger>['toggleModule']>[0]

export type SetInspectedNodeData = Parameters<
  ReturnType<typeof plugin.useDebugger>['setInspectedNode']
>[0]

export const { useDebugger, useLocator } = plugin
