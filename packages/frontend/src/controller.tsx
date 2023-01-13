import {
  ComputationUpdate,
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
import { createEventBus, createEventHub } from '@solid-primitives/event-bus'
import {
  batch,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  SignalOptions,
} from 'solid-js'
import createInspector from './modules/inspector'

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

export type HoveredNode = {
  type: 'element' | 'node'
  id: NodeID
}
const HOVER_NODE_OPTIONS: SignalOptions<HoveredNode | null> = {
  equals: (a, b) => a?.id === b?.id,
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
    const [extHoveredNode, setExtHoveredNode] = createSignal<HoveredNode | null>(
      null,
      HOVER_NODE_OPTIONS,
    )
    const hovered = createMemo(
      (): HoveredNode | null => {
        const clientNode = clientHoveredNode()
        return extHoveredNode() || (clientNode ? { id: clientNode, type: 'node' } : null)
      },
      undefined,
      HOVER_NODE_OPTIONS,
    )

    const isNodeHovered = createSelector(
      hovered,
      (id: NodeID, hoveredId) => !!hoveredId && id === hoveredId.id,
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
      inspectedNodeId: inspector.inspectedId,
      isNodeInspected: inspector.isNodeInspected,
      setLocatorState: setDevtoolsLocatorState,
      setInspectedNode: inspector.setInspectedNode,
      inspector,
      options,
      controller,
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
