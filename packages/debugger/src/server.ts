import { noop } from "@solid-primitives/utils"
import { Solid } from "@solid-devtools/shared/graph"
import { UNNAMED } from "@solid-devtools/shared/variables"
import * as API from "./index"
import { createRoot } from "solid-js"

export { createUnownedRoot } from "./index"

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = noop

export const registerDebuggerPlugin: typeof API.registerDebuggerPlugin = noop

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
export const getOwnerType: typeof API.getOwnerType = () => 0
export const getNodeType: typeof API.getNodeType = () => 0
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
