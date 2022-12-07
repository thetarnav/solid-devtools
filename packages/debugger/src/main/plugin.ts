import { Accessor, batch, createComputed, createMemo } from 'solid-js'
import { createEventHub, EventBus, EventHub } from '@solid-primitives/event-bus'
import { atom, defer } from '@solid-devtools/shared/primitives'
import { createBatchedUpdateEmitter } from './utils'
import {
  changeTreeWalkerMode,
  createInternalRoot,
  forceUpdateAllRoots,
  updateAllRoots,
  setComputationUpdateHandler,
  setRootUpdatesHandler,
  StructureUpdateHandler,
  useComponentsMap,
} from './roots'
import { createLocator } from '../locator'
import { createInspector, InspectorUpdate } from '../inspector'
import { ComputationUpdate, Mapped, StructureUpdates } from './types'

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

export default createInternalRoot(() => {
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
            combinedEnabled(enabled)
            if (enabled) {
              setRootUpdatesHandler(handleStructureUpdates)
            } else {
              setRootUpdatesHandler(null)
              locator.togglePluginLocatorMode(false)
              locator.setPluginHighlightTarget(null)
              inspector.setInspectedNode(null)
            }
          })
        },
      ),
    )

    return [
      () => combinedEnabled(),
      (signal: Accessor<boolean>): void => void userEnabledSignal(() => signal),
      (signal: Accessor<boolean>): void => void locatorEnabledSignal(() => signal),
    ]
  })()

  //
  // Inspected Owner details:
  //
  const inspector = createInspector(debuggerEnabled, { eventHub })

  const { findComponent, getComponent } = useComponentsMap()

  //
  // Locator
  //
  const locator = createLocator({
    findComponent,
    getComponent,
    debuggerEnabled,
    getElementById: inspector.getElementById,
    setLocatorEnabledSignal,
  })

  //
  // Structure & Computation updates:
  //
  const pushComputationUpdate = createBatchedUpdateEmitter<ComputationUpdate>(updates => {
    eventHub.emit('ComputationUpdates', updates)
  })
  setComputationUpdateHandler((rootId, id) => pushComputationUpdate({ rootId, id }))

  const handleStructureUpdates: StructureUpdateHandler = (updated, removedIds) => {
    eventHub.emit('StructureUpdates', { updated, removed: [...removedIds] })
  }

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
      triggerUpdate: updateAllRoots,
      forceTriggerUpdate: forceUpdateAllRoots,
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
    useDebugger,
    useLocator: locator.useLocator,
  }
})
