import { noop } from "@solid-primitives/utils"
import { NodeType, Solid } from "@solid-devtools/shared/graph"
import { UNNAMED } from "@solid-devtools/shared/variables"
import * as API from "./index"
import { createRoot } from "solid-js"
import { ElementMap } from "@solid-devtools/shared/serialize"

export { createUnownedRoot } from "./index"

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = noop

export const useDebugger: typeof API.useDebugger = () => ({
  triggerUpdate: noop,
  forceTriggerUpdate: noop,
  handleComputationUpdates: () => noop,
  handleSignalUpdates: () => noop,
  handleStructureUpdates: () => noop,
  components: () => ({}),
  findComponent: () => undefined,
  setInspectedOwner: noop,
  inspected: {
    details: null,
    elementMap: new ElementMap(),
    id: null,
    owner: null,
    rootId: null,
    signalMap: {},
  },
  handlePropsUpdate: () => noop,
  setInspectedSignal: () => null,
  setInspectedProp: noop,
})

// update
export const makeSolidUpdateListener: typeof API.makeSolidUpdateListener = () => noop
export const makeCreateRootListener: typeof API.makeCreateRootListener = () => noop
export const makeStoreObserver: typeof API.makeStoreObserver = () => noop
export const observeComputationUpdate: typeof API.observeComputationUpdate = noop
export const interceptComputationRerun: typeof API.interceptComputationRerun = noop
export const observeValueUpdate: typeof API.observeValueUpdate = noop
export const makeValueUpdateListener: typeof API.makeValueUpdateListener = noop
export const removeValueUpdateObserver: typeof API.removeValueUpdateObserver = noop

// utils
export const getOwnerType: typeof API.getOwnerType = () => NodeType.Computation
export const getNodeType: typeof API.getNodeType = () => NodeType.Computation
export const getNodeName: typeof API.getNodeName = () => UNNAMED
export const isSolidComputation: typeof API.isSolidComputation = (o): o is Solid.Computation =>
  false
export const isSolidMemo: typeof API.isSolidMemo = (o): o is Solid.Memo => false
export const isSolidOwner: typeof API.isSolidOwner = (o): o is Solid.Owner => false
export const isSolidRoot: typeof API.isSolidRoot = (o): o is Solid.Root => false
export const onOwnerCleanup: typeof API.onOwnerCleanup = () => noop
export const onParentCleanup: typeof API.onParentCleanup = () => noop
export const getFunctionSources: typeof API.getFunctionSources = () => []
export const createInternalRoot: typeof API.createInternalRoot = createRoot
export const lookupOwner: typeof API.lookupOwner = () => null
