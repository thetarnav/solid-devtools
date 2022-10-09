import {
  Accessor,
  batch,
  createContext,
  createEffect,
  createSignal,
  on,
  ParentComponent,
  useContext,
} from 'solid-js'
import { NodeID, NodeType, RootsUpdates } from '@solid-devtools/shared/graph'
import type { Messages } from '@solid-devtools/shared/bridge'
import createStructure, { Structure } from './modules/structure'
import createInspector, { Inspector } from './modules/inspector'
import { Listen } from '@solid-primitives/event-bus'

type ListenersFromPayloads<T extends Record<string, any>> = {
  [K in keyof Pick<
    T,
    keyof T extends infer R ? (R extends keyof T ? (R extends string ? R : never) : never) : never
  > as `on${K}`]: T[K] extends [void] ? () => void : (payload: T[K]) => void
}

interface ClientListenerPayloads {
  InspectValue: Messages['ToggleInspectedValue']
  ExtLocatorEnabledChange: boolean
  InspectedNodeChange: Messages['InspectedNodeChange']
  HighlightElementChange: Messages['HighlightElement']
}
export type ClientListeners = ListenersFromPayloads<ClientListenerPayloads>

interface DevtoolsListenerPayloads {
  ResetPanel: void
  SetInspectedDetails: Messages['SetInspectedDetails']
  StructureUpdate: RootsUpdates | null
  ComputationUpdates: Messages['ComputationUpdates']
  SignalUpdates: Messages['SignalUpdates']
  PropsUpdate: Messages['PropsUpdate']
  ValueUpdate: Messages['ValueUpdate']
  ClientLocatorModeChange: boolean
  ClientHoveredNodeChange: Messages['ClientHoveredNodeChange']
  ClientInspectedNode: Messages['ClientInspectedNode']
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

  updateStructure(update: RootsUpdates | null) {
    this.listeners.onStructureUpdate(update)
  }
  updateComputation(computationUpdate: Messages['ComputationUpdates']) {
    this.listeners.onComputationUpdates(computationUpdate)
  }
  updateSignals(signalUpdates: Messages['SignalUpdates']) {
    this.listeners.onSignalUpdates(signalUpdates)
  }
  updateProps(propsUpdate: Messages['PropsUpdate']) {
    this.listeners.onPropsUpdate(propsUpdate)
  }
  updateValue(valueUpdate: Messages['ValueUpdate']) {
    this.listeners.onValueUpdate(valueUpdate)
  }
  setInspectedDetails(ownerDetails: Messages['SetInspectedDetails']) {
    this.listeners.onSetInspectedDetails(ownerDetails)
  }
  resetPanel() {
    this.listeners.onResetPanel()
  }
  inspectValue(payload: Messages['ToggleInspectedValue']) {
    this.clientListeners.onInspectValue(payload)
  }
  setLocatorState(active: boolean) {
    this.listeners.onClientLocatorModeChange(active)
  }
  setHoveredNode(node: Messages['ClientHoveredNodeChange']) {
    this.listeners.onClientHoveredNodeChange(node)
  }
  setSelectedNode(node: Messages['ClientInspectedNode']) {
    this.listeners.onClientInspectedNode(node)
  }
}

const ControllerContext = createContext<{
  locatorEnabled: Accessor<boolean>
  inspectedDetails: Accessor<Inspector.Details | null>
  inspectedNode: Accessor<Structure.Node | null>
  structureState: Accessor<Structure.State>
  isNodeHovered(key: NodeID): boolean
  isNodeInspected(key: NodeID): boolean
  setExtLocatorState(state: boolean): void
  setInspectedNode(node: Structure.Node | null): void
  toggleHoveredNode(id: NodeID, hovered: boolean): Structure.Node | null
  listenToComputationUpdate: Listen<NodeID>
  inspector: ReturnType<typeof createInspector>
}>()

export const Provider: ParentComponent<{ controller: Controller }> = props => {
  const { controller } = props

  const [extLocatorEnabled, setExtLocatorState] = createSignal(false)
  const [clientLocatorEnabled, setClientLocator] = createSignal(false)
  const [clientHoveredNodeId, setClientHoveredId] = createSignal<NodeID | null>(null)

  const locatorEnabled = () => extLocatorEnabled() || clientLocatorEnabled()

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
        setExtLocatorState(false)
      })
    },
    onSetInspectedDetails(ownerDetails) {
      inspector.setDetails(ownerDetails)
    },
    onClientHoveredNodeChange({ nodeId, state }) {
      setClientHoveredId(p => {
        if (state) return nodeId ?? p
        return p && p === nodeId ? null : p
      })
    },
    onClientInspectedNode(node) {
      inspector.setInspectedNode(node)
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
    onSignalUpdates({ signals, update }) {
      inspector.handleSignalUpdates(signals, update)
    },
    onPropsUpdate(updated) {
      inspector.handlePropsUpdate(updated)
    },
    onValueUpdate({ value, update }) {
      inspector.handleValueUpdate(value, update)
    },
  })

  const client = controller.clientListeners

  // send inspected value/prop/signal
  inspector.setOnInspectValue(client.onInspectValue)

  // send inspected node
  createEffect(
    on(
      inspector.inspectedNode,
      node => {
        const data = node ? { nodeId: node.id, rootId: structure.getParentRoot(node).id } : null
        client.onInspectedNodeChange(data)
      },
      { defer: true },
    ),
  )

  // highlight hovered element
  createEffect(
    on(
      [structure.extHovered, inspector.hoveredElement],
      ([hovered, elId], _, prev: string | { rootId: NodeID; nodeId: NodeID } | undefined) => {
        // handle component
        if (hovered && hovered.type === NodeType.Component) {
          if (typeof prev === 'object' && prev.nodeId === hovered.id) return prev

          const rootId = structure.getParentRoot(hovered).id
          const payload = { rootId, nodeId: hovered.id }
          client.onHighlightElementChange(payload)
          return payload
        }
        // handle element
        if (elId) {
          if (typeof prev === 'string' && prev === elId) return prev
          client.onHighlightElementChange(elId)
          return elId
        }
        // no element or component
        if (prev) client.onHighlightElementChange(null)
      },
      { defer: true },
    ),
  )

  return (
    <ControllerContext.Provider
      value={{
        isNodeHovered: structure.isHovered,
        locatorEnabled,
        inspectedDetails: inspector.details,
        structureState: structure.state,
        inspectedNode: inspector.inspectedNode,
        isNodeInspected: inspector.isNodeInspected,
        setExtLocatorState,
        setInspectedNode: inspector.setInspectedNode,
        toggleHoveredNode: structure.toggleHoveredNode,
        listenToComputationUpdate: structure.listenToComputationUpdate,
        inspector,
      }}
    >
      {props.children}
    </ControllerContext.Provider>
  )
}

export function useController() {
  const ctx = useContext(ControllerContext)
  if (!ctx) {
    throw new Error('ControllerContext was not provided')
  }
  return ctx
}
