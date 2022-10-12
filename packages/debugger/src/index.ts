import { ParentComponent } from 'solid-js'
import { attachDebugger } from './roots'
import { makeCreateRootListener } from './update'

export const Debugger: ParentComponent = props => {
  attachDebugger()
  return props.children
}

let autoattachEnabled = false
export function enableRootsAutoattach(): void {
  if (autoattachEnabled) return
  autoattachEnabled = true
  makeCreateRootListener(root => attachDebugger(root))
}

export { useDebugger } from './plugin'
export type { BatchComputationUpdatesHandler, PluginData } from './plugin'

export { attachDebugger } from './roots'

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
