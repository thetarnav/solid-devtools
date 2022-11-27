import { createRoot, onCleanup } from 'solid-js'
import { throttle } from '@solid-primitives/scheduled'
import { untrackedCallback } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { ComputationUpdateHandler, WalkerResult, walkSolidTree } from './walker'
import { markNodeID, isSolidRoot, onOwnerCleanup, getOwner } from './utils'
import { Core, NodeID, Solid } from './types'
import { defaultWalkerMode, NodeType, TreeWalkerMode } from './constants'

// TREE WALKER MODE
let $treeWalkerMode: TreeWalkerMode = defaultWalkerMode

export function changeTreeWalkerMode(newMode: TreeWalkerMode): void {
  $treeWalkerMode = newMode
  updateAllRoots()
}

const $rootMap = new Map<
  NodeID,
  {
    readonly update: () => WalkerResult
    readonly dispose: VoidFunction
    readonly owner: Solid.Root
  }
>()

const $rootUpdateQueue = new Set<NodeID>()
const $removedRoots = new Set<NodeID>()
let $updateAllRoots = false

export type RootUpdatesHandler = (
  updateResults: WalkerResult[],
  removedIds: ReadonlySet<NodeID>,
) => void
let $onRootUpdates: RootUpdatesHandler | null = null

export function setRootUpdatesHandler(handler: RootUpdatesHandler | null): void {
  $onRootUpdates = handler
  if (handler) updateAllRoots()
}

let $onComputationUpdate: ComputationUpdateHandler | null = null
export function setComputationUpdateHandler(handler: ComputationUpdateHandler | null): void {
  $onComputationUpdate = handler
}

function forceFlushRootUpdateQueue(): void {
  if ($onRootUpdates) {
    const updated: WalkerResult[] = []
    if ($updateAllRoots) {
      for (const root of $rootMap.values()) updated.push(root.update())
      $updateAllRoots = false
    } else {
      for (const rootId of $rootUpdateQueue) {
        const root = $rootMap.get(rootId)
        if (root) updated.push(root.update())
      }
    }
    $onRootUpdates(updated, $removedRoots)
  }
  $rootUpdateQueue.clear()
  flushRootUpdateQueue.clear()
  $removedRoots.clear()
}
const flushRootUpdateQueue = throttle(forceFlushRootUpdateQueue, 300)

function updateRoot(rootId: NodeID): void {
  $rootUpdateQueue.add(rootId)
  flushRootUpdateQueue()
}

export function updateAllRoots(): void {
  $updateAllRoots = true
  flushRootUpdateQueue()
}

export function forceUpdateAllRoots(): void {
  $updateAllRoots = true
  forceFlushRootUpdateQueue()
}

export function createGraphRoot(owner: Solid.Root): void {
  // setup the debugger in a separate root, so that it doesn't walk and track itself
  createInternalRoot(dispose => {
    onOwnerCleanup(owner, dispose)

    const rootId = markNodeID(owner)

    const onComputationUpdate: ComputationUpdateHandler = (rootId, nodeId) => {
      updateRoot(rootId)
      $onComputationUpdate?.(rootId, nodeId)
    }

    const update = untrackedCallback(() => {
      return walkSolidTree(owner, {
        mode: $treeWalkerMode,
        onComputationUpdate,
        rootId,
      })
    })

    $rootMap.set(rootId, { update, dispose, owner })
    updateRoot(rootId)

    onCleanup(() => {
      $rootMap.delete(rootId)
      $rootUpdateQueue.delete(rootId)
      $removedRoots.add(rootId)
      flushRootUpdateQueue()
    })
  })
}

/**
 * Helps the debugger find and reattach an reactive owner created by `createRoot` to it's detached parent.
 *
 * Call this synchronously inside `createRoot` callback body, whenever you are using `createRoot` yourself to dispose of computations early, or inside `<For>`/`<Index>` components to reattach their children to reactive graph visible by the devtools debugger.
 * @example
 * createRoot(dispose => {
 * 	// This reactive Owner disapears form the owner tree
 *
 * 	// Reattach the Owner to the tree:
 * 	reattachOwner();
 * });
 */
export function attachDebugger(_owner: Core.Owner = getOwner()!): void {
  let owner = _owner as Solid.Owner
  if (!owner) return warn('reatachOwner helper should be called synchronously in a reactive owner.')

  const roots: Solid.Root[] = []
  while (owner) {
    if (isSolidRoot(owner)) {
      // INTERNAL | disposed
      if (owner.isInternal || owner.isDisposed) return
      // already attached
      if ($rootMap.has(markNodeID(owner))) break
      roots.push(owner)
    }
    owner = owner.owner!
  }

  // attach roots in reverse order
  for (let i = roots.length - 1; i >= 0; i--) {
    const root = roots[i]
    root.sdtType = NodeType.Root
    createGraphRoot(root)

    onOwnerCleanup(root, () => {
      root.isDisposed = true
    })

    let parent = findClosestAliveParent(root)!
    if (!parent.owner) return
    root.sdtAttached = parent.owner

    const onParentCleanup = () => {
      const newParent = findClosestAliveParent(root)
      // still a sub-root
      if (newParent.owner) {
        parent = newParent
        root.sdtAttached = parent.owner
        onOwnerCleanup(parent.root, onParentCleanup)
      }
      // becomes a root
      else {
        delete root.sdtAttached
        removeOwnCleanup()
      }
    }
    const removeParentCleanup = onOwnerCleanup(parent.root, onParentCleanup)
    const removeOwnCleanup = onOwnerCleanup(root, removeParentCleanup)
  }
}

/**
 * Unobserves currently observed root owners.
 * This is not reversable, and should be used only when you are sure that they won't be used anymore.
 */
export function unobserveAllRoots(): void {
  $rootMap.forEach(r => r.dispose())
}

//
// AFTER CREATE ROOT
//

let autoattachEnabled = false
let skipInternalRootCount = 0
/**
 * Listens to `createRoot` calls and attaches debugger to them.
 */
export function enableRootsAutoattach(): void {
  if (autoattachEnabled) return
  autoattachEnabled = true

  const autoattach = (root: Core.Owner) => {
    if (skipInternalRootCount) return
    attachDebugger(root)
  }

  if (typeof window._$afterCreateRoot === 'function') {
    const old = window._$afterCreateRoot
    window._$afterCreateRoot = (root: Core.Owner) => {
      old(root)
      autoattach(root)
    }
  } else window._$afterCreateRoot = autoattach
}

/**
 * Sold's `createRoot` primitive that won't be tracked by the debugger.
 */
export const createInternalRoot: typeof createRoot = (fn, detachedOwner) => {
  skipInternalRootCount++
  const r = createRoot(dispose => {
    ;(getOwner() as Solid.Root).isInternal = true
    return fn(dispose)
  }, detachedOwner)
  skipInternalRootCount--
  return r
}

/**
 * Looks though the children of the given root to find owner of given {@link id}.
 */
export const findOwnerById = (rootId: NodeID, id: NodeID): Solid.Owner | undefined => {
  const root = $rootMap.get(rootId)
  if (!root) return
  const toCheck: Solid.Owner[] = [root.owner]
  while (toCheck.length) {
    const owner = toCheck.pop()!
    if (owner.sdtId === id) return owner
    if (owner.owned) toCheck.push.apply(toCheck, owner.owned)
  }
}

/**
 * Searches for the closest alive parent of the given owner.
 * A parent here consists of `{ owner: SolidOwner; root: SolidRoot }` where `owner` is the closest tree node to attach to, and `root` in the closest subroot/root that is not disposed.
 * @param owner
 * @returns `{ owner: SolidOwner; root: SolidRoot }`
 */
function findClosestAliveParent(
  owner: Solid.Owner,
): { owner: Solid.Owner; root: Solid.Root } | { owner: null; root: null } {
  let disposed: Solid.Root | null = null
  let closestAliveRoot: Solid.Root | null = null
  let current = owner
  while (current.owner && !closestAliveRoot) {
    current = current.owner
    if (isSolidRoot(current)) {
      if (current.isDisposed) disposed = current
      else closestAliveRoot = current
    }
  }
  if (!closestAliveRoot) return { owner: null, root: null }
  return { owner: disposed?.owner ?? owner.owner!, root: closestAliveRoot }
}
