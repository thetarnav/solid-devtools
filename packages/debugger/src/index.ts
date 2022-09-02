import { ParentComponent } from "solid-js"
import { attachDebugger } from "./roots"

export { useDebugger } from "./plugin"
export type {
  FocusedState,
  SetSelectedOwner,
  SignaledRoot,
  BatchComputationUpdatesHandler,
  PluginData,
} from "./plugin"

export { attachDebugger } from "./roots"

export {
  makeSolidUpdateListener,
  makeCreateRootListener,
  makeStoreObserver,
  observeComputationUpdate,
  observeValueUpdate,
  interceptComputationRerun,
  makeValueUpdateListener,
  removeValueUpdateObserver,
} from "./update"
export type { AfterCrateRoot, ObjectObserver } from "./update"

export {
  getOwnerType,
  getNodeType,
  getNodeName,
  lookupOwner,
  isSolidComputation,
  isSolidMemo,
  isSolidOwner,
  isSolidRoot,
  onOwnerCleanup,
  onParentCleanup,
  getFunctionSources,
  createUnownedRoot,
  createInternalRoot,
} from "./utils"

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}
