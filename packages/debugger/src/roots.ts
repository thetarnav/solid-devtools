import { createEffect, onCleanup, untrack } from 'solid-js'
import { throttle } from '@solid-primitives/scheduled'
import { NodeID, NodeType } from '@solid-devtools/shared/graph'
import { untrackedCallback } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { ComputationUpdateHandler, WalkerResult, walkSolidTree } from './walker'
import plugin from './plugin'
import {
  createInternalRoot,
  getDebuggerContext,
  markNodeID,
  isSolidRoot,
  markOwnerType,
  onOwnerCleanup,
  removeDebuggerContext,
  setDebuggerContext,
  getOwner,
  INTERNAL,
} from './utils'
import { makeCreateRootListener } from './update'
import { Core, DebuggerContext, Solid } from './types'

const RootMap: Record<NodeID, (inspectedId?: NodeID) => WalkerResult | null> = {}
export const walkSolidRoot = (rootId: NodeID, inspectedId?: NodeID): WalkerResult | null => {
  const walk = RootMap[rootId]
  return walk ? walk(inspectedId) : null
}

export function createGraphRoot(owner: Solid.Root): void {
  // setup the debugger in a separate root, so that it doesn't walk and track itself
  createInternalRoot(dispose => {
    onOwnerCleanup(owner, dispose)

    const rootId = markNodeID(owner)

    const onComputationUpdate: ComputationUpdateHandler = (rootId, nodeId) => {
      if (owner.isDisposed) return
      if (untrack(plugin.enabled)) triggerRootUpdate()
      plugin.pushComputationUpdate(rootId, nodeId)
    }

    const forceRootUpdate = untrackedCallback((inspectedId?: NodeID | void) => {
      if (owner.isDisposed) return null
      const result = walkSolidTree(owner, {
        onComputationUpdate,
        rootId,
        inspectedId: inspectedId ?? null,
      })
      plugin.updateRoot(result.root, result.components)
      return result
    })
    const triggerRootUpdate = throttle(forceRootUpdate, 300)

    RootMap[rootId] = forceRootUpdate

    plugin.onUpdate(triggerRootUpdate)
    plugin.onForceUpdate(forceRootUpdate)

    createEffect(() => {
      // force trigger update when enabled changes to true
      plugin.enabled() && forceRootUpdate()
    })

    setDebuggerContext(owner, { rootId, triggerRootUpdate, forceRootUpdate })

    onCleanup(() => {
      removeDebuggerContext(owner)
      plugin.removeRoot(rootId)
      owner.isDisposed = true
      delete RootMap[rootId]
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

  forEachLookupRoot(owner, (root, ctx) => {
    if (ctx === INTERNAL) return

    root.sdtAttached = null
    markOwnerType(root, NodeType.Root)
    createGraphRoot(root)

    // under an existing debugger root
    if (ctx) {
      ctx.triggerRootUpdate()
      let parent = findClosestAliveParent(root)!
      if (!parent.owner) return warn('PARENT_SHOULD_BE_ALIVE')
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
          root.sdtAttached = null
          removeOwnCleanup()
        }
      }
      const removeParentCleanup = onOwnerCleanup(parent.root, onParentCleanup)
      const removeOwnCleanup = onOwnerCleanup(root, () => {
        root.isDisposed = true
        root.sdtAttached = null
        removeParentCleanup()
        ctx.triggerRootUpdate()
      })
    }
  })
}

let autoattachEnabled = false
/**
 * Listens to `createRoot` calls and attaches debugger to them.
 */
export function enableRootsAutoattach(): void {
  if (autoattachEnabled) return
  autoattachEnabled = true
  makeCreateRootListener(root => attachDebugger(root))
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

/**
 * Run callback for each subroot/root from the tree root to the given owner.
 * The callback is run only for roots that haven't been handled before.
 */
function forEachLookupRoot(
  owner: Solid.Owner,
  callback: (root: Solid.Root, ctx: DebuggerContext | undefined) => void,
): void {
  const roots: Solid.Root[] = []
  let ctx: DebuggerContext | undefined
  do {
    // check if it's a root/subroot
    if (isSolidRoot(owner)) {
      // skip already handled and INTERNAL roots
      if ('sdtAttached' in owner) {
        if (!ctx) ctx = getDebuggerContext(owner)
        break
      }
      if (owner.sdtContext === INTERNAL) {
        ctx = INTERNAL
        break
      }
      roots.push(owner as Solid.Root)
    }
    owner = owner.owner!
  } while (owner)
  // callback roots in downwards direction
  for (let i = roots.length - 1; i >= 0; i--) {
    const root = roots[i]
    callback(root, ctx)
    // check if context was added during callback
    if (root.sdtContext) ctx = root.sdtContext
  }
}
