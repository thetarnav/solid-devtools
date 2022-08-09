import { ParentComponent } from "solid-js"
import { attachDebugger } from "./roots"

// export all graph types from the internal "shared" library
export * from "@solid-devtools/shared/graph"

export { registerDebuggerPlugin } from "./plugin"
export type {
  PluginFactory,
  FocusedState,
  SetFocusedOwner,
  SignaledRoot,
  RootsUpdates,
} from "./plugin"

export type { TargetIDE, TargetURLFunction } from "@solid-devtools/locator"

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
  getSafeValue,
  createUnownedRoot,
  createInternalRoot,
} from "./utils"

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}
