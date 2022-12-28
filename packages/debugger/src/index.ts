import { ParentComponent } from 'solid-js'
import { attachDebugger } from './main/roots'

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}

export { markComponentLoc } from './locator'
export {
  attachDebugger,
  createInternalRoot,
  enableRootsAutoattach,
  unobserveAllRoots,
} from './main/roots'
export {
  interceptComputationRerun,
  makeSolidUpdateListener,
  makeValueUpdateListener,
  observeValueUpdate,
  removeValueUpdateObserver,
} from './main/update'
export {
  getFunctionSources,
  getNodeName,
  getNodeType,
  getOwner,
  getOwnerType,
  isSolidComputation,
  isSolidMemo,
  isSolidOwner,
  isSolidRoot,
  isSolidStore,
  lookupOwner,
  onOwnerCleanup,
  onParentCleanup,
} from './main/utils'
export * from './types'

import plugin from './main/plugin'
export const useDebugger = plugin.useDebugger
export const useLocator = plugin.useLocator
