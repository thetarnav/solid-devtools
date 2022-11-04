import type * as API from './index'
import { createRoot } from 'solid-js'
import type { Solid } from './main/types'
import { NodeType } from './main/constants'

export * from './types'

export { createUnownedRoot } from './index'

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = () => {}

export const useDebugger: typeof API.useDebugger = () => ({
  triggerUpdate: () => {},
  forceTriggerUpdate: () => {},
  listenTo: () => () => {},
  setInspectedNode: () => {},
  handlePropsUpdate: () => () => {},
  setInspectedSignal: () => null,
  setInspectedProp: () => {},
  inspectedDetails: () => null,
  setInspectedValue: () => null,
  enabled: () => false,
  toggleEnabled: () => {},
  inspector: {
    setInspectedNode: () => {},
    toggleValueNode: () => {},
  },
  locator: {
    toggleEnabled: () => {},
    addClickInterceptor: () => {},
    enabledByDebugger: () => false,
    setHighlightTarget: () => {},
    onHoveredComponent: () => () => {},
  },
})

export const enableRootsAutoattach: typeof API.enableRootsAutoattach = () => {}
export const useLocator: typeof API.useLocator = () => {}

// update
export const makeSolidUpdateListener: typeof API.makeSolidUpdateListener = () => () => {}
export const makeCreateRootListener: typeof API.makeCreateRootListener = () => () => {}
export const observeComputationUpdate: typeof API.observeComputationUpdate = () => {}
export const interceptComputationRerun: typeof API.interceptComputationRerun = () => {}
export const observeValueUpdate: typeof API.observeValueUpdate = () => {}
export const makeValueUpdateListener: typeof API.makeValueUpdateListener = () => {}
export const removeValueUpdateObserver: typeof API.removeValueUpdateObserver = () => {}

// utils
export const getOwner: typeof API.getOwner = () => null
export const getOwnerType: typeof API.getOwnerType = () => NodeType.Computation
export const getNodeType: typeof API.getNodeType = () => NodeType.Computation
export const getNodeName: typeof API.getNodeName = () => '(unnamed)'
export const isSolidComputation: typeof API.isSolidComputation = (o): o is Solid.Computation =>
  false
export const isSolidMemo: typeof API.isSolidMemo = (o): o is Solid.Memo => false
export const isSolidOwner: typeof API.isSolidOwner = (o): o is Solid.Owner => false
export const isSolidRoot: typeof API.isSolidRoot = (o): o is Solid.Root => false
export const isSolidStore: typeof API.isSolidStore = (o): o is Solid.Store => false
export const onOwnerCleanup: typeof API.onOwnerCleanup = () => () => {}
export const onParentCleanup: typeof API.onParentCleanup = () => () => {}
export const getFunctionSources: typeof API.getFunctionSources = () => []
export const createInternalRoot: typeof API.createInternalRoot = createRoot
export const lookupOwner: typeof API.lookupOwner = () => null
