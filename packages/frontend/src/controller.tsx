import { batch, createEffect, createSignal, on } from 'solid-js'
import { createContextProvider } from '@solid-primitives/context'
import {
  ComputationUpdate,
  HighlightElementPayload,
  Mapped,
  NodeID,
  NodeType,
  StructureUpdates,
  TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import type {
  InspectorUpdate,
  SetInspectedNodeData,
  ToggleInspectedValueData,
} from '@solid-devtools/debugger'
import createStructure from './modules/structure'
import createInspector from './modules/inspector'
import { defer } from '@solid-devtools/shared/primitives'

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

    const inspector = createInspector({
      findNode: structure.findNode,
      getNodePath: structure.getNodePath,
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
        batch(() => {
          structure.updateStructure(update)
          inspector.handleStructureChange()
        })
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
    inspector.setOnInspectNode(node => {
      client.onInspectNode(
        node ? { nodeId: node.id, rootId: structure.getRootNode(node).id } : null,
      )
    })
    // toggle inspected value/prop/signal
    inspector.setOnInspectValue(client.onInspectValue)

    // LOCATION
    // open component location
    inspector.setOnOpenLocation(client.onOpenLocation)

    // highlight hovered element
    createEffect(
      on(
        [structure.extHovered, inspector.hoveredElement],
        ([nodeId, elementId], _, prev: HighlightElementPayload = null) => {
          // handle component
          if (nodeId) {
            const hovered = structure.findNode(nodeId)
            if (hovered && hovered.type === NodeType.Component) {
              if (prev && 'nodeId' in prev && prev.nodeId === nodeId) return prev

              const payload = { nodeId }
              client.onHighlightElementChange(payload)
              return payload
            }
          }
          // handle element
          if (elementId) {
            if (prev && 'elementId' in prev && prev.elementId === elementId) return prev

            const payload = { elementId }
            client.onHighlightElementChange(payload)
            return payload
          }
          // no element or component
          if (prev) client.onHighlightElementChange(null)
        },
        { defer: true },
      ),
    )

    // TREE VIEW MODE
    createEffect(defer(structure.mode, client.onTreeViewModeChange))

    let lastSearch: string = ''
    let lastSearchResults: NodeID[] | undefined
    let lastSearchIndex = 0
    function searchStructure(query: string): void {
      if (query === lastSearch) {
        if (lastSearchResults) {
          lastSearchIndex = (lastSearchIndex + 1) % lastSearchResults.length
          inspector.setInspectedNode(lastSearchResults[lastSearchIndex])
        }
        return
      } else {
        lastSearch = query
        const result = structure.search(query)
        if (result) inspector.setInspectedNode(result[(lastSearchIndex = 0)])
        lastSearchResults = result
      }
    }

    return {
      locatorEnabled,
      structureState: structure.state,
      inspectedNode: inspector.inspectedNode,
      isNodeInspected: inspector.isNodeInspected,
      setLocatorState: setDevtoolsLocatorState,
      setInspectedNode: inspector.setInspectedNode,
      toggleHoveredNode: structure.toggleHoveredNode,
      listenToComputationUpdate: structure.listenToComputationUpdate,
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
