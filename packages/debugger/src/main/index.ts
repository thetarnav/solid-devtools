import { defer } from '@solid-devtools/shared/primitives'
import { createEventHub, createSimpleEmitter } from '@solid-primitives/event-bus'
import { Accessor, batch, createEffect, createMemo, createSignal } from 'solid-js'
import { createDependencyGraph, DGraphUpdate } from '../dependency'
import { createInspector, InspectorUpdate } from '../inspector'
import { createLocator } from '../locator'
import { createStructure, StructureUpdates } from '../structure'
import { DEFAULT_MAIN_VIEW, DevtoolsMainView } from './constants'
import { getOwnerById, getSdtId } from './id'
import { createInternalRoot, getTopRoot } from './roots'
import { Mapped, NodeID, Solid } from './types'
import { createBatchedUpdateEmitter } from './utils'

export type InspectedState = {
  readonly rootId: NodeID
  readonly owner: Solid.Owner | null
  readonly signal: Solid.Signal | null
} | null

function createDebuggerEventHub() {
  return createEventHub($ => ({
    NodeUpdates: $<NodeID[]>(),
    StructureUpdates: $<StructureUpdates>(),
    InspectorUpdate: $<InspectorUpdate[]>(),
    InspectedNodeDetails: $<Mapped.OwnerDetails>(),
    DgraphUpdate: $<DGraphUpdate>(),
  }))
}
export type DebuggerEventHub = ReturnType<typeof createDebuggerEventHub>

const plugin = createInternalRoot(() => {
  const eventHub = createDebuggerEventHub()

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
  // Current Open VIEW
  //
  let currentView: DevtoolsMainView = DEFAULT_MAIN_VIEW
  const [listenToViewChange, emitViewChange] = createSimpleEmitter<DevtoolsMainView>()

  function setView(view: DevtoolsMainView) {
    batch(() => {
      setStructureEnabled(view === DevtoolsMainView.Structure)
      setDgraphEnabled(view === DevtoolsMainView.Dgraph)
      emitViewChange((currentView = view))
    })
  }

  //
  // Inspected Node
  //

  // Current inspected node is shared between modules
  let inspectedState: InspectedState = null
  const [listenToInspectedState, emitInspectedStateChange] = createSimpleEmitter<InspectedState>()

  const getInspecredNodeById = (id: null | NodeID): InspectedState => {
    if (!id) return null
    const owner = getOwnerById(id)
    if (!owner) return null
    const root = getTopRoot(owner)
    if (!root) return null
    return { rootId: getSdtId(root), owner, signal: null }
  }

  function setInspectedNode(id: null | NodeID): void {
    emitInspectedStateChange((inspectedState = getInspecredNodeById(id)))
  }

  /** Check if the inspected node doesn't need to change (treeview mode changed or sth) */
  function updateInspectedNode() {
    if (!inspectedState || !inspectedState.owner) return
    const closest = structure.getClosestIncludedOwner(inspectedState.owner)
    if (closest && closest === inspectedState.owner) return

    const root = closest && getTopRoot(closest)
    inspectedState =
      !closest || !root ? null : { rootId: getSdtId(root), owner: closest, signal: null }
    emitInspectedStateChange(inspectedState)
  }

  createEffect(
    defer(debuggerEnabled, enabled => {
      if (!enabled) setInspectedNode(null)
    }),
  )

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
    structureEnabled,
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

  const dgraph = createDependencyGraph({
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
      setView,
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
