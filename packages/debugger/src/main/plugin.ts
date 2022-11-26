import { Accessor, batch, createComputed, createMemo, createSignal } from 'solid-js'
import {
  createEventHub,
  createSimpleEmitter,
  EventBus,
  EventHub,
} from '@solid-primitives/event-bus'
import { throttle } from '@solid-primitives/scheduled'
import { atom, defer } from '@solid-devtools/shared/primitives'
import { createBatchedUpdateEmitter, createInternalRoot } from './utils'
import { ComputationUpdateHandler } from './walker'
import { createLocator } from '../locator'
import { createInspector, InspectorUpdate } from '../inspector'
import { ComputationUpdate, Mapped, NodeID, RootsUpdates } from './types'
import { defaultWalkerMode, TreeWalkerMode } from './constants'

export type BatchComputationUpdatesHandler = (payload: ComputationUpdate[]) => void

type DebuggerEventHubMessages = {
  ComputationUpdates: ComputationUpdate[]
  StructureUpdates: RootsUpdates
  InspectorUpdate: InspectorUpdate[]
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
    StructureUpdates: bus(),
    InspectorUpdate: bus(),
    InspectedNodeDetails: bus(),
  }))

  //
  // Debugger Enabled
  //
  const [debuggerEnabled, setUserEnabledSignal, setLocatorEnabledSignal] = (() => {
    // is locator module enabled
    const locatorEnabledSignal = atom<Accessor<boolean>>()
    // is debugger used in the app
    const userEnabledSignal = atom<Accessor<boolean>>()
    const combinedEnabled = atom<boolean>(false)

    createComputed(
      defer(
        createMemo(() => !!locatorEnabledSignal()?.() || !!userEnabledSignal()?.()),
        enabled => {
          batch(() => {
            debuggerEnabled(enabled)
            if (!enabled) {
              setComponents({})
              locator.togglePluginLocatorMode(false)
              locator.setPluginHighlightTarget(null)
              inspector.setInspectedNode(null)
            }
          })
        },
      ),
    )

    return [
      combinedEnabled,
      (signal: Accessor<boolean>): void => void userEnabledSignal(() => signal),
      (signal: Accessor<boolean>): void => void locatorEnabledSignal(() => signal),
    ]
  })()

  // TREE WALKER MODE
  let treeWalkerMode: TreeWalkerMode = defaultWalkerMode

  function changeTreeWalkerMode(newMode: TreeWalkerMode): void {
    treeWalkerMode = newMode
    triggerUpdate()
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
  const _pushComputationUpdate = createBatchedUpdateEmitter<ComputationUpdate>(updates => {
    eventHub.emit('ComputationUpdates', updates)
  })
  const pushComputationUpdate: ComputationUpdateHandler = (rootId, id) => {
    _pushComputationUpdate({ rootId, id })
  }

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
  // Inspected Owner details:
  //
  const inspector = createInspector(debuggerEnabled, { eventHub })

  //
  // Locator
  //
  const locator = createLocator({
    components,
    debuggerEnabled,
    findComponent,
    getElementById: inspector.getElementById,
    setLocatorEnabledSignal,
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
      listenTo: eventHub.on,
      setUserEnabledSignal,
      triggerUpdate,
      forceTriggerUpdate,
      openInspectedNodeLocation,
      changeTreeWalkerMode,
      inspector: {
        setInspectedNode: inspector.setInspectedNode,
        toggleValueNode: inspector.toggleValueNode,
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
    getTreeWalkerMode: () => treeWalkerMode,
  }
})
