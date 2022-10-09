import { NodeType, Solid } from '@solid-devtools/shared/graph'
import { UNNAMED } from '@solid-devtools/shared/variables'
import * as API from './index'
import { createRoot } from 'solid-js'

export { createUnownedRoot } from './index'

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = () => {}

export const useDebugger: typeof API.useDebugger = () => ({
  triggerUpdate: () => {},
  forceTriggerUpdate: () => {},
  listenTo: () => () => {},
  components: () => ({}),
  findComponent: () => undefined,
  setInspectedOwner: () => {},
  getElementById: () => undefined,
  handlePropsUpdate: () => () => {},
  setInspectedSignal: () => null,
  setInspectedProp: () => {},
  inspectedDetails: () => null,
  setInspectedValue: () => null,
})

export const enableRootsAutoattach: typeof API.enableRootsAutoattach = () => {}

// update
export const makeSolidUpdateListener: typeof API.makeSolidUpdateListener = () => () => {}
export const makeCreateRootListener: typeof API.makeCreateRootListener = () => () => {}
export const makeStoreObserver: typeof API.makeStoreObserver = () => () => {}
export const observeComputationUpdate: typeof API.observeComputationUpdate = () => {}
export const interceptComputationRerun: typeof API.interceptComputationRerun = () => {}
export const observeValueUpdate: typeof API.observeValueUpdate = () => {}
export const makeValueUpdateListener: typeof API.makeValueUpdateListener = () => {}
export const removeValueUpdateObserver: typeof API.removeValueUpdateObserver = () => {}

// utils
export const getOwnerType: typeof API.getOwnerType = () => NodeType.Computation
export const getNodeType: typeof API.getNodeType = () => NodeType.Computation
export const getNodeName: typeof API.getNodeName = () => UNNAMED
export const isSolidComputation: typeof API.isSolidComputation = (o): o is Solid.Computation =>
  false
export const isSolidMemo: typeof API.isSolidMemo = (o): o is Solid.Memo => false
export const isSolidOwner: typeof API.isSolidOwner = (o): o is Solid.Owner => false
export const isSolidRoot: typeof API.isSolidRoot = (o): o is Solid.Root => false
export const onOwnerCleanup: typeof API.onOwnerCleanup = () => () => {}
export const onParentCleanup: typeof API.onParentCleanup = () => () => {}
export const getFunctionSources: typeof API.getFunctionSources = () => []
export const createInternalRoot: typeof API.createInternalRoot = createRoot
export const lookupOwner: typeof API.lookupOwner = () => null
