import {
  DebuggerModule,
  DevtoolsMainView,
  DGraphUpdate,
  HighlightElementPayload,
  InspectorUpdate,
  Mapped,
  NodeID,
  SetInspectedNodeData,
  StructureUpdates,
  ToggleInspectedValueData,
  ToggleModuleData,
  TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { defer } from '@solid-devtools/shared/primitives'
import { createContextProvider } from '@solid-primitives/context'
import { SECOND } from '@solid-primitives/date'
import { createEventBus, createEventHub } from '@solid-primitives/event-bus'
import { debounce } from '@solid-primitives/scheduled'
import { batch, createEffect, createMemo, createSelector, createSignal, onCleanup } from 'solid-js'
import createInspector from './modules/inspector'
import type { Structure } from './modules/structure'

export function createController() {
  // Listener of the client events (from the debugger) will be called synchronously under `batch`
  // to make sure that the state is updated before the effect queue is flushed.
  function batchedBus<T>() {
    return createEventBus<T>({ emitGuard: batch })
  }

  const devtools = createEventHub($ => ({
    inspectNode: $<SetInspectedNodeData>(),
    inspectValue: $<ToggleInspectedValueData>(),
    highlightElementChange: $<HighlightElementPayload>(),
    openLocation: $<void>(),
    treeViewModeChange: $<TreeWalkerMode>(),
    viewChange: $<DevtoolsMainView>(),
    toggleModule: $<ToggleModuleData>(),
  }))

  const client = createEventHub({
    resetPanel: batchedBus<void>(),
    setInspectedDetails: batchedBus<Mapped.OwnerDetails>(),
    structureUpdate: batchedBus<StructureUpdates>(),
    nodeUpdates: batchedBus<NodeID[]>(),
    inspectorUpdate: batchedBus<InspectorUpdate[]>(),
    locatorModeChange: batchedBus<boolean>(),
    hoveredComponent: batchedBus<{ nodeId: NodeID; state: boolean }>(),
    inspectedComponent: batchedBus<NodeID>(),
    dgraphUpdate: batchedBus<DGraphUpdate>(),
  })

  return { client, devtools }
}

export type Controller = ReturnType<typeof createController>

/**
 * Views when disposed can cache their state to be restored when opened again.
 * The short cache is cleared after 3 seconds of inactivity.
 * The long cache is cleared when the view is opened again.
 */
function createViewCache() {
  type CacheDataMap = {
    [DevtoolsMainView.Structure]: Structure.Cache
  }
  let shortCache: null | any = null
  let nextShortCache: typeof shortCache = null
  const longCache = new Map<keyof CacheDataMap, any>()

  const clearShortCache = debounce(() => {
    shortCache = null
    nextShortCache = null
  }, 3 * SECOND)

  function setCacheGetter<T extends DevtoolsMainView>(view: T, getter: () => CacheDataMap[T]) {
    onCleanup(() => {
      const data = getter()
      nextShortCache = { view: view as any, data: data.short }
      longCache.set(view, data.long)
      clearShortCache()
    })
  }
  function getCache<T extends DevtoolsMainView>(
    view: T,
  ): { [K in 'short' | 'long']: CacheDataMap[T][K] | null } {
    const short = shortCache && shortCache.view === view ? shortCache.data : null
    shortCache = nextShortCache
    nextShortCache = null
    const long = longCache.get(view)
    longCache.delete(view)
    return { short, long }
  }

  return { set: setCacheGetter, get: getCache }
}

const [Provider, useControllerCtx] = createContextProvider(
  ({ controller, options }: { controller: Controller; options: { useShortcuts: boolean } }) => {
    const { client, devtools } = controller

    //
    // LOCATOR
    //
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = createSignal(false)
    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

    // send devtools locator state
    createEffect(
      defer(devtoolsLocatorEnabled, enabled =>
        devtools.toggleModule.emit({ module: DebuggerModule.Locator, enabled }),
      ),
    )

    function setClientLocatorState(enabled: boolean) {
      batch(() => {
        setClientLocator(enabled)
        if (!enabled) setClientHoveredNode(null)
      })
    }

    //
    // HOVERED NODE
    //
    const [clientHoveredNode, setClientHoveredNode] = createSignal<NodeID | null>(null)
    const [extHoveredNode, setExtHoveredNode] = createSignal<{
      type: 'element' | 'node'
      id: NodeID
    } | null>(null, { equals: (a, b) => a?.id === b?.id })

    // highlight hovered element
    createEffect(defer(extHoveredNode, devtools.highlightElementChange.emit))

    const hoveredId = createMemo(() => {
      const extNode = extHoveredNode()
      return extNode ? extNode.id : clientHoveredNode()
    })
    const isNodeHovered = createSelector<NodeID | null, NodeID>(hoveredId)

    function toggleHoveredNode(id: NodeID, type: 'element' | 'node' = 'node', isHovered?: boolean) {
      return setExtHoveredNode(p =>
        p && p.id === id ? (isHovered ? p : null) : isHovered ? { id, type } : p,
      )
    }
    function toggleHoveredElement(id: NodeID, isHovered?: boolean) {
      return toggleHoveredNode(id, 'element', isHovered)
    }

    //
    // OPENED MAIN VIEW
    //
    // * there is no need for different views now

    const [openedView, setOpenedView] = createSignal<DevtoolsMainView>(DevtoolsMainView.Structure)
    const viewCache = createViewCache()

    function openView(view: DevtoolsMainView) {
      setOpenedView(view)
    }

    createEffect(defer(openedView, devtools.viewChange.emit))

    //
    // INSPECTOR
    //
    const inspector = createInspector()

    // set inspected node
    createEffect(defer(inspector.inspectedNode, devtools.inspectNode.emit))

    // toggle inspected value/prop/signal
    inspector.setOnInspectValue(devtools.inspectValue.emit)

    // open component location
    inspector.setOnOpenLocation(devtools.openLocation.emit)

    //
    // Client events
    //
    client.on('resetPanel', () => {
      setClientLocatorState(false)
      setDevtoolsLocatorState(false)
      inspector.setInspectedOwner(null)
    })

    client.on('setInspectedDetails', inspector.setDetails)
    client.on('inspectorUpdate', inspector.update)

    client.on('hoveredComponent', ({ nodeId, state }) => {
      setClientHoveredNode(p => (state ? nodeId : p && p === nodeId ? null : p))
    })

    client.on('inspectedComponent', node => {
      inspector.setInspectedOwner(node)
      setDevtoolsLocatorState(false)
    })

    client.on('locatorModeChange', setClientLocatorState)

    return {
      locator: {
        locatorEnabled,
        setLocatorState: setDevtoolsLocatorState,
      },
      hovered: {
        isNodeHovered,
        hoveredId,
        toggleHoveredNode,
        toggleHoveredElement,
      },
      view: {
        get: openedView,
        set: openView,
      },
      inspector,
      options,
      controller,
      viewCache,
    }
  },
)

export { Provider }

export function useController() {
  const ctx = useControllerCtx()
  if (!ctx) {
    throw new Error('ControllerContext was not provided')
  }
  return ctx
}
