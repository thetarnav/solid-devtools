import { ParentComponent } from 'solid-js'
import { attachDebugger } from './main/roots'

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}

export * from './types'

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
} from './main/utils'

export {
  makeSolidUpdateListener,
  observeComputationUpdate,
  observeValueUpdate,
  interceptComputationRerun,
  makeValueUpdateListener,
  removeValueUpdateObserver,
} from './main/update'

export {
  attachDebugger,
  enableRootsAutoattach,
  unobserveAllRoots,
  createInternalRoot,
} from './main/roots'

export { markComponentLoc } from './locator'

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

import plugin from './main/plugin'
export const useDebugger = plugin.useDebugger
export const useLocator = plugin.useLocator
export type { BatchComputationUpdatesHandler } from './main/plugin'
