import { noop } from "@solid-primitives/utils"
import { SolidComputation, SolidMemo, SolidOwner, SolidRoot } from "@shared/graph"
import { UNNAMED } from "@shared/variables"
import * as API from "./index"
import { createRoot } from "solid-js"

export { getSafeValue, createUnownedRoot } from "./index"

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = noop

export const registerDebuggerPlugin: typeof API.registerDebuggerPlugin = noop

// update
export const makeSolidUpdateListener: typeof API.makeSolidUpdateListener = () => noop
export const makeCreateRootListener: typeof API.makeCreateRootListener = () => noop
export const observeComputationUpdate: typeof API.observeComputationUpdate = noop
export const observeValueUpdate: typeof API.observeValueUpdate = () => noop
export const interceptComputationRerun: typeof API.interceptComputationRerun = noop

// utils
export const getOwnerType: typeof API.getOwnerType = () => 0
export const getNodeType: typeof API.getNodeType = () => 0
export const getNodeName: typeof API.getNodeName = () => UNNAMED
export const isSolidComputation: typeof API.isSolidComputation = (o): o is SolidComputation => false
export const isSolidMemo: typeof API.isSolidMemo = (o): o is SolidMemo => false
export const isSolidOwner: typeof API.isSolidOwner = (o): o is SolidOwner => false
export const isSolidRoot: typeof API.isSolidRoot = (o): o is SolidRoot => false
export const onOwnerCleanup: typeof API.onOwnerCleanup = () => noop
export const onParentCleanup: typeof API.onParentCleanup = () => noop
export const getFunctionSources: typeof API.getFunctionSources = () => []
export const createInternalRoot: typeof API.createInternalRoot = createRoot
