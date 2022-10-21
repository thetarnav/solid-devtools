import { ParentComponent } from 'solid-js'
import { attachDebugger } from './roots'

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}

import plugin from './plugin'
export const useDebugger = plugin.useDebugger
export const useLocator = plugin.useLocator
export type { BatchComputationUpdatesHandler } from './plugin'

export { attachDebugger, enableRootsAutoattach } from './roots'

export {
  makeSolidUpdateListener,
  makeCreateRootListener,
  makeStoreObserver,
  observeComputationUpdate,
  observeValueUpdate,
  interceptComputationRerun,
  makeValueUpdateListener,
  removeValueUpdateObserver,
} from './update'
export type { AfterCrateRoot, ObjectObserver } from './update'

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
} from './utils'

export type { LocatorOptions, TargetIDE, TargetURLFunction } from './locator'
