import {
  ComputationUpdate,
  DevtoolsMainView,
  HighlightElementPayload,
  InspectorUpdate,
  Mapped,
  NodeID,
  StructureUpdates,
  ToggleInspectedValueData,
  TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { defer } from '@solid-devtools/shared/primitives'
import { createContextProvider } from '@solid-primitives/context'
import { SECOND } from '@solid-primitives/date'
import { createEventBus, createEventHub } from '@solid-primitives/event-bus'
import { debounce } from '@solid-primitives/scheduled'
import { batch, createEffect, createMemo, createSelector, createSignal, onCleanup } from 'solid-js'
import type { Dgraph } from './modules/dependency/dgraph'
import createInspector from './modules/inspector'
import type { Structure } from './modules/structure'

export function createController() {
  // Listener of the client events (from the debugger) will be called synchronously under `batch`
  // to make sure that the state is updated before the effect queue is flushed.
  function batchedBus<T>() {
    return createEventBus<T>({ emitGuard: batch })
  }

  const devtools = createEventHub($ => ({
    inspectNode: $<NodeID | null>(),
    inspectValue: $<ToggleInspectedValueData>(),
    devtoolsLocatorStateChange: $<boolean>(),
    highlightElementChange: $<HighlightElementPayload>(),
    openLocation: $<void>(),
    treeViewModeChange: $<TreeWalkerMode>(),
  }))

  const client = createEventHub({
    resetPanel: batchedBus<void>(),
    setInspectedDetails: batchedBus<Mapped.OwnerDetails>(),
    structureUpdate: batchedBus<StructureUpdates>(),
    computationUpdates: batchedBus<ComputationUpdate[]>(),
    inspectorUpdate: batchedBus<InspectorUpdate[]>(),
    clientLocatorModeChange: batchedBus<boolean>(),
    clientHoveredComponent: batchedBus<{ nodeId: NodeID; state: boolean }>(),
    clientInspectedNode: batchedBus<NodeID>(),
  })

  return { client, devtools }
}

export type Controller = ReturnType<typeof createController>

// Views when disposed can cache their state to be restored when opened again.
// The short cache is cleared after 3 seconds of inactivity.
// The long cache is cleared when the view is opened again.
function createViewCache() {
  type CacheDataMap = {
    [DevtoolsMainView.Structure]: Structure.Cache
    [DevtoolsMainView.Dgraph]: Dgraph.Cache
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

    const isNodeHovered = createSelector<NodeID | null, NodeID>(
      createMemo(() => {
        const extNode = extHoveredNode()
        return extNode ? extNode.id : clientHoveredNode()
      }),
    )

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
    const [openedView, setOpenedView] = createSignal<DevtoolsMainView>(DevtoolsMainView.Structure)

    const viewCache = createViewCache()

    //
    // INSPECTOR
    //
    const inspector = createInspector()

    client.on('resetPanel', () => {
      setClientLocatorState(false)
      setDevtoolsLocatorState(false)
      inspector.setInspectedNode(null)
    })

    client.on('setInspectedDetails', inspector.setDetails)
    client.on('inspectorUpdate', inspector.update)

    client.on('clientHoveredComponent', ({ nodeId, state }) => {
      setClientHoveredNode(p => {
        if (state) return nodeId ?? p
        return p && p === nodeId ? null : p
      })
    })

    client.on('clientInspectedNode', node => {
      inspector.setInspectedNode(node)
      setDevtoolsLocatorState(false)
    })

    client.on('clientLocatorModeChange', setClientLocatorState)

    // send devtools locator state
    createEffect(defer(devtoolsLocatorEnabled, devtools.devtoolsLocatorStateChange.emit))

    // set inspected node
    createEffect(defer(inspector.inspectedId, devtools.inspectNode.emit))

    // toggle inspected value/prop/signal
    inspector.setOnInspectValue(devtools.inspectValue.emit)

    // LOCATION
    // open component location
    inspector.setOnOpenLocation(devtools.openLocation.emit)

    // highlight hovered element
    createEffect(defer(extHoveredNode, devtools.highlightElementChange.emit))

    return {
      locatorEnabled,
      isNodeHovered,
      toggleHoveredNode,
      toggleHoveredElement,
      openedView,
      setOpenedView,
      inspectedNodeId: inspector.inspectedId,
      isNodeInspected: inspector.isNodeInspected,
      setLocatorState: setDevtoolsLocatorState,
      setInspectedNode: inspector.setInspectedNode,
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
