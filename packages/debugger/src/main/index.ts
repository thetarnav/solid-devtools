import { createEventBus, createGlobalEmitter, GlobalEmitter } from '@solid-primitives/event-bus'
import { createStaticStore, defer } from '@solid-primitives/utils'
import { batch, createComputed, createEffect, createMemo } from 'solid-js'
import { createDependencyGraph, DGraphUpdate } from '../dependency'
import { createInspector, InspectorUpdate, ToggleInspectedValueData } from '../inspector'
import { createLocator } from '../locator'
import { HighlightElementPayload } from '../locator/types'
import { createStructure, StructureUpdates } from '../structure'
import { DebuggerModule, DEFAULT_MAIN_VIEW, DevtoolsMainView, TreeWalkerMode } from './constants'
import { getObjectById, ObjectType } from './id'
import { createInternalRoot } from './roots'
import { Mapped, NodeID, Solid } from './types'
import { createBatchedUpdateEmitter } from './utils'

export type InspectedState = {
  readonly owner: Solid.Owner | null
  readonly signal: Solid.Signal | null
}

export namespace Debugger {
  export type OutputChannels = {
    ResetPanel: void
    InspectedNodeDetails: Mapped.OwnerDetails | null
    StructureUpdates: StructureUpdates
    NodeUpdates: NodeID[]
    InspectorUpdate: InspectorUpdate[]
    LocatorModeChange: boolean
    HoveredComponent: { nodeId: NodeID; state: boolean }
    InspectedComponent: NodeID
    DgraphUpdate: DGraphUpdate
  }

  export type InputChannels = {
    ResetState: void
    InspectNode: { ownerId: NodeID | null; signalId: NodeID | null } | null
    InspectValue: ToggleInspectedValueData
    HighlightElementChange: HighlightElementPayload
    OpenLocation: void
    TreeViewModeChange: TreeWalkerMode
    ViewChange: DevtoolsMainView
    ToggleModule: { module: DebuggerModule; enabled: boolean }
  }
}

export type DebuggerEmitter = {
  output: GlobalEmitter<Debugger.OutputChannels>
  input: GlobalEmitter<Debugger.InputChannels>
}

const plugin = createInternalRoot(() => {
  const hub: DebuggerEmitter = {
    output: createGlobalEmitter(),
    input: createGlobalEmitter(),
  }

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

  const debuggerEnabledBus = createEventBus<boolean>()

  createEffect(() => {
    if (!debuggerEnabled()) debuggerEnabledBus.emit(false)
  })

  //
  // Current Open VIEW (currently not used)
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let currentView: DevtoolsMainView = DEFAULT_MAIN_VIEW
  const viewChange = createEventBus<DevtoolsMainView>()

  function setView(view: DevtoolsMainView) {
    batch(() => {
      // setStructureEnabled(view === DevtoolsMainView.Structure)
      // setDgraphEnabled(view === DevtoolsMainView.Dgraph)
      viewChange.emit((currentView = view))
    })
  }

  //
  // Enabled Modules
  //
  function toggleModule(data: Debugger.InputChannels['ToggleModule']): void {
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
  const inspectedStateBus = createEventBus<InspectedState>()

  createComputed(
    defer(debuggerEnabled, enabled => {
      if (!enabled) inspectedStateBus.emit((inspectedState = { owner: null, signal: null }))
    }),
  )

  /** Check if the inspected node doesn't need to change (treeview mode changed or sth) */
  function updateInspectedNode() {
    if (!inspectedState.owner) return
    const closest = structure.getClosestIncludedOwner(inspectedState.owner)
    if (closest && closest === inspectedState.owner) return

    inspectedStateBus.emit((inspectedState = { owner: closest, signal: null }))
  }

  function setInspectedNode(data: Debugger.InputChannels['InspectNode']): void {
    const { ownerId, signalId } = data ?? {}
    const owner = ownerId && getObjectById(ownerId, ObjectType.Owner)
    const signal = signalId && getObjectById(signalId, ObjectType.Signal)
    inspectedStateBus.emit((inspectedState = { owner: owner ?? null, signal: signal ?? null }))
  }

  // Computation and signal updates
  const pushNodeUpdate = createBatchedUpdateEmitter<NodeID>(updates => {
    hub.output.emit('NodeUpdates', updates)
  })

  //
  // Structure:
  //
  const structure = createStructure({
    onStructureUpdate(updates) {
      hub.output.emit('StructureUpdates', updates)
      updateInspectedNode()
    },
    onNodeUpdate: pushNodeUpdate,
    enabled: debuggerEnabled,
    listenToViewChange: viewChange.listen,
  })

  //
  // Inspected Owner details:
  //
  const inspector = createInspector({
    emit: hub.output.emit,
    enabled: debuggerEnabled,
    listenToInspectedNodeChange: inspectedStateBus.listen,
  })

  //
  // Dependency Graph
  //
  createDependencyGraph({
    emit: hub.output.emit,
    enabled: dgraphEnabled,
    listenToInspectedStateChange: inspectedStateBus.listen,
    listenToViewChange: viewChange.listen,
    onNodeUpdate: pushNodeUpdate,
  })

  //
  // Locator
  //
  const locator = createLocator({
    emit: hub.output.emit,
    listenToDebuggerEenable: debuggerEnabledBus.listen,
    locatorEnabled,
    setLocatorEnabledSignal: signal => toggleModules('locatorKeyPressSignal', () => signal),
  })

  // Opens the source code of the inspected component
  function openInspectedNodeLocation() {
    const details = inspector.getLastDetails()
    if (!details || !details.location) return
    locator.openElementSourceCode(details.location, details.name)
  }

  // send the state of the client locator mode
  createEffect(
    defer(modules.locatorKeyPressSignal, state => hub.output.emit('LocatorModeChange', state)),
  )

  // intercept on-page components clicks and send them to the devtools overlay
  // TODO: this shouldn't be abstracted away here
  locator.addClickInterceptor((e, component) => {
    if (!modules.debugger) return
    e.preventDefault()
    e.stopPropagation()
    hub.output.emit('InspectedComponent', component.id)
    return false
  })

  hub.input.listen(e => {
    switch (e.name) {
      case 'ResetState': {
        // reset all the internal state
        inspectedStateBus.emit((inspectedState = { owner: null, signal: null }))
        currentView = DEFAULT_MAIN_VIEW
        structure.resetTreeWalkerMode()
        break
      }
      case 'HighlightElementChange':
        return locator.setDevtoolsHighlightTarget(e.details)
      case 'InspectNode':
        return setInspectedNode(e.details)
      case 'InspectValue':
        return inspector.toggleValueNode(e.details)
      case 'OpenLocation':
        return openInspectedNodeLocation()
      case 'TreeViewModeChange':
        return structure.setTreeWalkerMode(e.details)
      case 'ViewChange':
        return setView(e.details)
      case 'ToggleModule':
        return toggleModule(e.details)
    }
  })

  /**
   * Used for connecting debugger to devtools
   */
  function useDebugger() {
    return {
      enabled: debuggerEnabled,
      toggleEnabled: (enabled: boolean) => void toggleModules('debugger', enabled),
      on: hub.output.on,
      listen: hub.output.listen,
      emit: hub.input.emit,
    }
  }

  return {
    useDebugger,
    useLocator: locator.useLocator,
  }
})

export const { useDebugger, useLocator } = plugin
