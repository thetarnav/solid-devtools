import type {
  InspectorUpdate,
  SetInspectedNodeData,
  ToggleInspectedValueData,
} from '@solid-devtools/debugger'
import {
  ComputationUpdate,
  HighlightElementPayload,
  Mapped,
  NodeID,
  NodeType,
  StructureUpdates,
  TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { defer } from '@solid-devtools/shared/primitives'
import { createContextProvider } from '@solid-primitives/context'
import { batch, createEffect, createMemo, createSignal } from 'solid-js'
import createInspector from './modules/inspector'
import createStructure from './modules/structure'

type ListenersFromPayloads<T extends Record<string, any>> = {
  [K in keyof Pick<
    T,
    keyof T extends infer R ? (R extends keyof T ? (R extends string ? R : never) : never) : never
  > as `on${K}`]: T[K] extends [void] ? () => void : (payload: T[K]) => void
}

interface ClientListenerPayloads {
  InspectNode: SetInspectedNodeData
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

const [Provider, useControllerCtx] = createContextProvider(
  ({ controller, options }: { controller: Controller; options: { useShortcuts: boolean } }) => {
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = createSignal(false)
    const [clientHoveredNodeId, setClientHoveredId] = createSignal<NodeID | null>(null)

    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

    function setClientLocatorState(enabled: boolean) {
      batch(() => {
        setClientLocator(enabled)
        if (!enabled) setClientHoveredId(null)
      })
    }

    const structure = createStructure({
      clientHoveredNodeId,
    })

    const inspector = createInspector({ findNode: structure.findNode })

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
        setClientHoveredId(p => {
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
    createEffect(
      defer(devtoolsLocatorEnabled, enabled => client.onDevtoolsLocatorStateChange(enabled)),
    )

    // set inspected node
    // TODO: don't use structure here
    createEffect(
      defer(inspector.inspectedId, id => {
        if (!id) return client.onInspectNode(null)
        const node = structure.findNode(id)
        if (!node) return client.onInspectNode(null)
        client.onInspectNode({ nodeId: id, rootId: structure.getRootNode(node).id })
      }),
    )
    // toggle inspected value/prop/signal
    inspector.setOnInspectValue(client.onInspectValue)

    // LOCATION
    // open component location
    inspector.setOnOpenLocation(client.onOpenLocation)

    // highlight hovered element

    const hovered = createMemo<{ elementId: NodeID } | { nodeId: NodeID } | undefined>(
      () => {
        const elementId = inspector.hoveredElement()
        if (elementId) return { elementId }
        const nodeId = structure.extHovered()
        if (nodeId) return { nodeId }
      },
      undefined,
      {
        equals: (a, b) => {
          if (a && b) {
            if ('elementId' in a && 'elementId' in b) return a.elementId === b.elementId
            if ('nodeId' in a && 'nodeId' in b) return a.nodeId === b.nodeId
          }
          return false
        },
      },
    )

    const getHightlightPayload = (
      id: NonNullable<ReturnType<typeof hovered>>,
    ): undefined | NonNullable<HighlightElementPayload> => {
      // handle element
      if ('elementId' in id)
        return {
          elementId: id.elementId,
          type: 'element',
        }

      // handle component | element node
      const { nodeId } = id
      const node = structure.findNode(nodeId)

      if (!node || (node.type !== NodeType.Component && node.type !== NodeType.Element)) return

      if (node.type === NodeType.Component)
        return {
          componentId: nodeId,
          type: 'componentNode',
        }

      const component = structure.getClosestComponentNode(node)
      if (component)
        return {
          componentId: component.id,
          elementId: nodeId,
          type: 'elementNode',
        }
    }

    createEffect(
      defer(hovered, (hoveredValue, _, prev: ReturnType<typeof getHightlightPayload> | void) => {
        if (!hoveredValue) return client.onHighlightElementChange(null)

        const payload = getHightlightPayload(hoveredValue)
        if (!payload && !prev) return

        client.onHighlightElementChange(payload ?? null)
        return payload
      }),
    )

    // TREE VIEW MODE
    createEffect(defer(structure.mode, client.onTreeViewModeChange))

    function changeTreeViewMode(newMode: TreeWalkerMode): void {
      if (newMode === structure.mode()) return
      batch(() => {
        structure.setMode(newMode)
        searchStructure('')
      })
    }

    // SEARCH NODES
    let lastSearch: string = ''
    let lastSearchResults: NodeID[] | undefined
    let lastSearchIndex = 0
    function searchStructure(query: string): void {
      if (query === lastSearch) {
        if (lastSearchResults) {
          lastSearchIndex = (lastSearchIndex + 1) % lastSearchResults.length
          inspector.setInspectedNode(lastSearchResults[lastSearchIndex]!)
        }
        return
      } else {
        lastSearch = query
        const result = structure.search(query)
        if (result) inspector.setInspectedNode(result[(lastSearchIndex = 0)]!)
        lastSearchResults = result
      }
    }

    return {
      locatorEnabled,
      structureState: structure.state,
      inspectedNodeId: inspector.inspectedId,
      isNodeInspected: inspector.isNodeInspected,
      setLocatorState: setDevtoolsLocatorState,
      setInspectedNode: inspector.setInspectedNode,
      listenToComputationUpdate: structure.listenToComputationUpdate,
      changeTreeViewMode,
      inspector,
      structure,
      searchStructure,
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
