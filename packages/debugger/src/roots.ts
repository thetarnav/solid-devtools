import { createEffect, onCleanup, untrack } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import {
  DebuggerContext,
  getOwner,
  NodeID,
  NodeType,
  Solid,
  Core,
} from "@solid-devtools/shared/graph"
import { INTERNAL } from "@solid-devtools/shared/variables"
import { untrackedCallback } from "@solid-devtools/shared/primitives"
import { warn } from "@solid-devtools/shared/utils"
import { ComputationUpdateHandler, WalkerResult, walkSolidTree } from "./walker"
import {
  enabled,
  onForceUpdate,
  onUpdate,
  updateRoot,
  removeRoot,
  gatherComponents,
  pushComputationUpdate,
} from "./plugin"
import {
  createInternalRoot,
  getDebuggerContext,
  markNodeID,
  isSolidRoot,
  markOwnerType,
  onOwnerCleanup,
  removeDebuggerContext,
  setDebuggerContext,
} from "./utils"

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
      if (untrack(enabled)) triggerRootUpdate()
      pushComputationUpdate(rootId, nodeId)
    }

    const forceRootUpdate = untrackedCallback((inspectedId?: NodeID | void) => {
      if (owner.isDisposed) return null
      const result = walkSolidTree(owner, {
        onComputationUpdate,
        rootId,
        inspectedId: inspectedId ?? null,
        gatherComponents: gatherComponents(),
      })
      updateRoot(result.root, result.components)
      return result
    })
    const triggerRootUpdate = throttle(forceRootUpdate, 300)

    RootMap[rootId] = forceRootUpdate

    onUpdate(triggerRootUpdate)
    onForceUpdate(forceRootUpdate)

    createEffect(() => {
      // force trigger update when enabled changes to true
      enabled() && forceRootUpdate()
    })

    setDebuggerContext(owner, { rootId, triggerRootUpdate, forceRootUpdate })

    onCleanup(() => {
      removeDebuggerContext(owner)
      removeRoot(rootId)
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
  if (!owner) return warn("reatachOwner helper should be called synchronously in a reactive owner.")

  forEachLookupRoot(owner, (root, ctx) => {
    if (ctx === INTERNAL) return

    root.sdtAttachedTo = null
    markOwnerType(root, NodeType.Root)
    createGraphRoot(root)

    // under an existing debugger root
    if (ctx) {
      ctx.triggerRootUpdate()
      let parent = findClosestAliveParent(root)!
      if (!parent.owner) return warn("PARENT_SHOULD_BE_ALIVE")
      root.sdtAttachedTo = parent.owner

      const onParentCleanup = () => {
        const newParent = findClosestAliveParent(root)
        // still a sub-root
        if (newParent.owner) {
          parent = newParent
          root.sdtAttachedTo = parent.owner
          onOwnerCleanup(parent.root, onParentCleanup)
        }
        // becomes a root
        else {
          root.sdtAttachedTo = null
          removeOwnCleanup()
        }
      }
      const removeParentCleanup = onOwnerCleanup(parent.root, onParentCleanup)
      const removeOwnCleanup = onOwnerCleanup(root, () => {
        root.isDisposed = true
        root.sdtAttachedTo = null
        removeParentCleanup()
        ctx.triggerRootUpdate()
      })
    }
  })
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
      if ("sdtAttachedTo" in owner) {
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
