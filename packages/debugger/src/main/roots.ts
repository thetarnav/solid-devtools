import { warn } from '@solid-devtools/shared/utils'
import { createRoot } from 'solid-js'
import { clearComponentRegistry } from './componentRegistry'
import { NodeType } from './constants'
import { getSdtId } from './id'
import { Core, NodeID, Solid } from './types'
import { getOwner, isSolidRoot, onOwnerCleanup } from './utils'

// ROOTS
// map of all top-roots
const RootMap = new Map<NodeID, Solid.Root>()
export const getCurrentRoots = (): Iterable<Solid.Root> => RootMap.values()

let OnOwnerNeedsUpdate: ((owner: Solid.Owner, rootId: NodeID) => void) | undefined
/** Listens to owners that have their structure changed, because of roots */
export function setOnOwnerNeedsUpdate(fn: typeof OnOwnerNeedsUpdate) {
  OnOwnerNeedsUpdate = fn
}
let OnRootRemoved: ((rootId: NodeID) => void) | undefined
/** Listens to roots that were removed */
export function setOnRootRemoved(fn: typeof OnRootRemoved) {
  OnRootRemoved = fn
}

export function createTopRoot(owner: Solid.Root): void {
  const rootId = getSdtId(owner)
  RootMap.set(rootId, owner)
  OnOwnerNeedsUpdate?.(owner, rootId)
}

function cleanupRoot(root: Solid.Root): void {
  const rootId = getSdtId(root)
  root.isDisposed = true
  changeRootAttachment(root, null)

  const wasTarcked = RootMap.delete(rootId)
  if (wasTarcked) OnRootRemoved?.(rootId)
}

/**
 * For switching what owner sub-roots are attached to.
 * It'll remove the root from its current owner and attach it to the new owner.
 */
function changeRootAttachment(root: Solid.Root, newParent: Solid.Owner | null): void {
  let topRoot: Solid.Root | undefined | null

  if (root.sdtAttached) {
    root.sdtAttached.sdtSubRoots!.splice(root.sdtAttached.sdtSubRoots!.indexOf(root), 1)
    topRoot = getTopRoot(root.sdtAttached)
    if (topRoot) OnOwnerNeedsUpdate?.(root.sdtAttached, getSdtId(topRoot))
  }

  if (newParent) {
    root.sdtAttached = newParent
    if (newParent.sdtSubRoots) newParent.sdtSubRoots.push(root)
    else newParent.sdtSubRoots = [root]

    if (topRoot === undefined) topRoot = getTopRoot(newParent)
    if (topRoot) OnOwnerNeedsUpdate?.(newParent, getSdtId(topRoot))
  } else {
    delete root.sdtAttached
  }
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
 * 	attachDebugger();
 * });
 */
export function attachDebugger(_owner: Core.Owner = getOwner()!): void {
  let owner = _owner as Solid.Owner
  if (!owner) return warn('reatachOwner helper should be called synchronously in a reactive owner.')

  // find all the roots in the owner tree (walking up the tree)
  const roots: Solid.Root[] = []
  let isFirstTopLevel = true
  while (owner) {
    if (isSolidRoot(owner)) {
      // INTERNAL | disposed
      if (owner.isInternal || owner.isDisposed) return
      // already attached
      if (RootMap.has(getSdtId(owner))) {
        isFirstTopLevel = false
        break
      }
      roots.push(owner)
    }
    owner = owner.owner!
  }

  // attach roots in reverse order (from top to bottom)
  for (let i = roots.length - 1; i >= 0; i--) {
    const root = roots[i]!
    root.sdtType = NodeType.Root

    onOwnerCleanup(root, () => cleanupRoot(root), true)

    const isTopLevel = isFirstTopLevel && i === 0

    // root (top-level)
    if (isTopLevel) {
      createTopRoot(root)
      return
    }
    // sub-root (nested)
    let parent = findClosestAliveParent(root)!
    if (!parent.owner) return warn('Parent owner is missing.')
    changeRootAttachment(root, parent.owner)

    const onParentCleanup = () => {
      const newParent = findClosestAliveParent(root)
      changeRootAttachment(root, newParent.owner)
      // still a sub-root
      if (newParent.owner) {
        parent = newParent
        onOwnerCleanup(parent.root, onParentCleanup)
      }
      // becomes a root
      else {
        removeOwnCleanup()
        createTopRoot(root)
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
  RootMap.forEach(r => cleanupRoot(r))
  clearComponentRegistry()
}

//
// AFTER CREATE ROOT
//

let AutoattachEnabled = false
let InternalRootCount = 0
/**
 * Listens to `createRoot` calls and attaches debugger to them.
 */
export function enableRootsAutoattach(): void {
  if (AutoattachEnabled) return
  AutoattachEnabled = true

  const autoattach = (root: Core.Owner) => {
    if (InternalRootCount) return
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
  InternalRootCount++
  const r = createRoot(dispose => {
    ;(getOwner() as Solid.Root).isInternal = true
    return fn(dispose)
  }, detachedOwner)
  InternalRootCount--
  return r
}

/**
 * Finds the top-level root owner of a given owner.
 */
export function getTopRoot(owner: Solid.Owner): Solid.Root | null {
  let root: Solid.Root | null = null
  do {
    if (isSolidRoot(owner) && !owner.isInternal && !owner.isDisposed) root = owner
    owner = owner.owner!
  } while (owner)
  return root
}

/**
 * Searches for the closest alive parent of the given owner.
 * A parent here consists of `{ owner: SolidOwner; root: SolidRoot }` where `owner` is the closest tree node to attach to, and `root` in the closest subroot/root that is not disposed.
 * @param owner
 * @returns `{ owner: SolidOwner; root: SolidRoot }`
 */
export function findClosestAliveParent(
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
  return { owner: (disposed ?? owner).owner!, root: closestAliveRoot }
}
