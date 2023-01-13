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
import {
  batch,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  SignalOptions,
} from 'solid-js'
import createInspector from './modules/inspector'
import createStructure from './modules/structure'

type ListenersFromPayloads<T extends Record<string, any>> = {
  [K in keyof Pick<
    T,
    keyof T extends infer R ? (R extends keyof T ? (R extends string ? R : never) : never) : never
  > as `on${K}`]: T[K] extends [void] ? () => void : (payload: T[K]) => void
}

interface ClientListenerPayloads {
  InspectNode: NodeID | null
  InspectValue: ToggleInspectedValueData
  DevtoolsLocatorStateChange: boolean
  HighlightElementChange: HighlightElementPayload
  OpenLocation: void
  TreeViewModeChange: TreeWalkerMode
}
export type ClientListeners = ListenersFromPayloads<ClientListenerPayloads>

interface DevtoolsListenerPayloads {
  ResetPanel: void
  SetInspectedDetails: Mapped.OwnerDetails
  StructureUpdate: StructureUpdates
  ComputationUpdates: ComputationUpdate[]
  InspectorUpdate: InspectorUpdate[]
  ClientLocatorModeChange: boolean
  ClientHoveredComponent: { nodeId: NodeID; state: boolean }
  ClientInspectedNode: NodeID
}
export type DevtoolsListeners = ListenersFromPayloads<DevtoolsListenerPayloads>

export class Controller {
  private listeners!: DevtoolsListeners

  constructor(public clientListeners: ClientListeners) {}

  connectDevtools(devtoolsListeners: DevtoolsListeners) {
    if (this.listeners) {
      throw new Error('Devtools already connected!')
    }
    this.listeners = devtoolsListeners
  }

  updateStructure(update: StructureUpdates) {
    this.listeners.onStructureUpdate(update)
  }
  updateComputation(computationUpdate: DevtoolsListenerPayloads['ComputationUpdates']) {
    this.listeners.onComputationUpdates(computationUpdate)
  }
  updateInspector(inspectorUpdate: DevtoolsListenerPayloads['InspectorUpdate']) {
    this.listeners.onInspectorUpdate(inspectorUpdate)
  }
  setInspectedDetails(ownerDetails: DevtoolsListenerPayloads['SetInspectedDetails']) {
    this.listeners.onSetInspectedDetails(ownerDetails)
  }
  resetPanel() {
    this.listeners.onResetPanel()
  }
  setLocatorState(active: boolean) {
    this.listeners.onClientLocatorModeChange(active)
  }
  setHoveredNode(node: DevtoolsListenerPayloads['ClientHoveredComponent']) {
    this.listeners.onClientHoveredComponent(node)
  }
  setInspectedNode(node: DevtoolsListenerPayloads['ClientInspectedNode']) {
    this.listeners.onClientInspectedNode(node)
  }
}

export type HoveredNode = {
  type: 'element' | 'node'
  id: NodeID
}
const HOVER_NODE_OPTIONS: SignalOptions<HoveredNode | null> = {
  equals: (a, b) => a?.id === b?.id,
}

const [Provider, useControllerCtx] = createContextProvider(
  ({ controller, options }: { controller: Controller; options: { useShortcuts: boolean } }) => {
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = createSignal(false)

    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

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
        const client = clientHoveredNode()
        return extHoveredNode() || (client ? { id: client, type: 'node' } : null)
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

    function setClientLocatorState(enabled: boolean) {
      batch(() => {
        setClientLocator(enabled)
        if (!enabled) setClientHoveredNode(null)
      })
    }

    const inspector = createInspector()

    const structure = createStructure({
      inspectedNodeId: inspector.inspectedId,
      setInspected: inspector.setInspectedNode,
    })

    controller.connectDevtools({
      onResetPanel() {
        batch(() => {
          structure.updateStructure(null)
          setClientLocatorState(false)
          setDevtoolsLocatorState(false)
          inspector.setInspectedNode(null)
        })
      },
      onSetInspectedDetails(ownerDetails) {
        inspector.setDetails(ownerDetails)
      },
      onClientHoveredComponent({ nodeId, state }) {
        setClientHoveredNode(p => {
          if (state) return nodeId ?? p
          return p && p === nodeId ? null : p
        })
      },
      onClientInspectedNode(node) {
        batch(() => {
          inspector.setInspectedNode(node)
          setDevtoolsLocatorState(false)
        })
      },
      onClientLocatorModeChange(active) {
        setClientLocatorState(active)
      },
      onComputationUpdates(updated) {
        updated.forEach(({ id }) => structure.emitComputationUpdate(id))
      },
      onStructureUpdate(update) {
        structure.updateStructure(update)
      },
      onInspectorUpdate(payload) {
        inspector.update(payload)
      },
    })

    const client = controller.clientListeners

    // send devtools locator state
    createEffect(defer(devtoolsLocatorEnabled, client.onDevtoolsLocatorStateChange))

    // set inspected node
    createEffect(defer(inspector.inspectedId, client.onInspectNode))

    // toggle inspected value/prop/signal
    inspector.setOnInspectValue(client.onInspectValue)

    // LOCATION
    // open component location
    inspector.setOnOpenLocation(client.onOpenLocation)

    // highlight hovered element
    createEffect(defer(extHoveredNode, client.onHighlightElementChange))

    // TREE VIEW MODE
    createEffect(defer(structure.mode, client.onTreeViewModeChange))

    return {
      locatorEnabled,
      isNodeHovered,
      toggleHoveredNode,
      toggleHoveredElement,
      structureState: structure.state,
      inspectedNodeId: inspector.inspectedId,
      isNodeInspected: inspector.isNodeInspected,
      setLocatorState: setDevtoolsLocatorState,
      setInspectedNode: inspector.setInspectedNode,
      listenToComputationUpdate: structure.listenToComputationUpdate,
      inspector,
      structure,
      options,
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
