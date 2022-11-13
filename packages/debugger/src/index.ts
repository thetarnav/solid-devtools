import { ParentComponent } from 'solid-js'
import { attachDebugger } from './main/roots'

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}

import plugin from './main/plugin'
export const useDebugger = plugin.useDebugger
export const useLocator = plugin.useLocator
export type { BatchComputationUpdatesHandler } from './main/plugin'

export { attachDebugger, enableRootsAutoattach } from './main/roots'

export {
  makeSolidUpdateListener,
  makeCreateRootListener,
  observeComputationUpdate,
  observeValueUpdate,
  interceptComputationRerun,
  makeValueUpdateListener,
  removeValueUpdateObserver,
} from './main/update'
export type { AfterCrateRoot } from './main/update'

export {
  getOwner,
  getOwnerType,
  getNodeType,
  getNodeName,
  lookupOwner,
  isSolidComputation,
  isSolidMemo,
  isSolidOwner,
  isSolidRoot,
  isSolidStore,
  onOwnerCleanup,
  onParentCleanup,
  getFunctionSources,
  createUnownedRoot,
  createInternalRoot,
} from './main/utils'

export type {
  LocatorOptions,
  TargetIDE,
  TargetURLFunction,
  HighlightElementPayload,
} from './locator'

export type {
  InspectorUpdate,
  SetInspectedNodeData,
  ToggleInspectedValueData,
  ProxyPropsUpdate,
  StoreNodeUpdate,
  ValueNodeUpdate,
} from './inspector'

export * from './types'
