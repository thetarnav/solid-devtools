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
} from './main/utils'

export {
  makeSolidUpdateListener,
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

import plugin from './main/plugin'
export const useDebugger = plugin.useDebugger
export const useLocator = plugin.useLocator
