import { Debugger, DebuggerModule, DevtoolsMainView, NodeID } from '@solid-devtools/debugger/types'
import { defer } from '@solid-devtools/shared/primitives'
import { createContextProvider } from '@solid-primitives/context'
import { SECOND } from '@solid-primitives/date'
import { batchEmits, createEventBus, createEventHub, EventBus } from '@solid-primitives/event-bus'
import { debounce } from '@solid-primitives/scheduled'
import { batch, createEffect, createMemo, createSelector, createSignal, onCleanup } from 'solid-js'
import createInspector from './modules/inspector'
import type { Structure } from './modules/structure'

// TODO: add to solid-primitives/event-bus
type ToEventBusChannels<T extends Record<string, any>> = {
  [K in keyof T]: EventBus<T[K]>
}

export function createController() {
  const devtools = createEventHub<ToEventBusChannels<Debugger.InputChannels>>($ => ({
    ForceUpdate: $(),
    InspectNode: $(),
    InspectValue: $(),
    HighlightElementChange: $(),
    OpenLocation: $(),
    TreeViewModeChange: $(),
    ViewChange: $(),
    ToggleModule: $(),
  }))

  // Listener of the client events (from the debugger) will be called synchronously under `batch`
  // to make sure that the state is updated before the effect queue is flushed.
  const client = createEventHub<ToEventBusChannels<Debugger.OutputChannels>>($ => ({
    ResetPanel: batchEmits($()),
    InspectedNodeDetails: batchEmits($()),
    StructureUpdates: batchEmits($()),
    NodeUpdates: batchEmits($()),
    InspectorUpdate: batchEmits($()),
    LocatorModeChange: batchEmits($()),
    HoveredComponent: batchEmits($()),
    InspectedComponent: batchEmits($()),
    DgraphUpdate: batchEmits($()),
  }))

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
        devtools.ToggleModule.emit({ module: DebuggerModule.Locator, enabled }),
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
    createEffect(defer(extHoveredNode, devtools.HighlightElementChange.emit))

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

    createEffect(defer(openedView, devtools.ViewChange.emit))

    //
    // Node updates - signals and computations updating
    //
    const nodeUpdates = createEventBus<NodeID>()
    client.NodeUpdates.listen(updated => updated.forEach(id => nodeUpdates.emit(id)))

    //
    // INSPECTOR
    //
    const inspector = createInspector()

    // set inspected node
    createEffect(defer(inspector.inspectedNode, devtools.InspectNode.emit))

    // toggle inspected value/prop/signal
    inspector.setOnInspectValue(devtools.InspectValue.emit)

    // open component location
    inspector.setOnOpenLocation(devtools.OpenLocation.emit)

    //
    // Client events
    //
    client.ResetPanel.listen(() => {
      setClientLocatorState(false)
      setDevtoolsLocatorState(false)
      inspector.setInspectedOwner(null)
    })

    client.InspectedNodeDetails.listen(inspector.setDetails)
    client.InspectorUpdate.listen(inspector.update)

    client.HoveredComponent.listen(({ nodeId, state }) => {
      setClientHoveredNode(p => (state ? nodeId : p && p === nodeId ? null : p))
    })

    client.InspectedComponent.listen(node => {
      inspector.setInspectedOwner(node)
      setDevtoolsLocatorState(false)
    })

    client.LocatorModeChange.listen(setClientLocatorState)

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
      listenToNodeUpdates: nodeUpdates.listen,
      listenToNodeUpdate(id: NodeID, fn: VoidFunction) {
        return nodeUpdates.listen(updatedId => updatedId === id && fn())
      },
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
