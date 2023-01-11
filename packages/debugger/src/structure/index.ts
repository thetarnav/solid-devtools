import { throttle } from '@solid-primitives/scheduled'
import * as registry from '../main/componentRegistry'
import { DEFAULT_WALKER_MODE, NodeType, TreeWalkerMode } from '../main/constants'
import { getSdtId } from '../main/id'
import * as roots from '../main/roots'
import { Mapped, NodeID, Solid } from '../main/types'
import { isDisposed, markOwnerType } from '../main/utils'
import { ComputationUpdateHandler, walkSolidTree } from './walker'

export type StructureUpdates = {
  removed: NodeID[]
  /** Record: `rootId` -- Record of updated nodes by `nodeId` */
  updated: Partial<Record<NodeID, Partial<Record<NodeID, Mapped.Owner>>>>
}

export type Structure = {
  onStructureUpdate: (
    structureUpdates: StructureUpdates['updated'],
    removedIds: ReadonlySet<NodeID>,
  ) => void
  onComputationUpdate: (rootId: NodeID, nodeId: NodeID) => void
}

/**
 * Finds the closest owner of a given owner that is included in the tree walker.
 */
// TODO unit test this
function getClosestIncludedOwner(owner: Solid.Owner, mode: TreeWalkerMode): Solid.Owner | null {
  // 1. make sure the tree is not disposed
  // if it is, find the non-disposed owner and use as the owner
  let closest: Solid.Owner | null = null
  let current: Solid.Owner | null = owner
  do {
    if (isDisposed(current)) closest = current.owner
    current = current.owner
  } while (current)
  owner = closest ?? owner

  // 2. find the closest owner that is included in the tree walker
  if (mode === TreeWalkerMode.Owners) return owner
  let root: Solid.Owner | null = null
  do {
    const type = markOwnerType(owner)
    if (type === NodeType.Component || type === NodeType.Context) return owner
    if (type === NodeType.Root) root = owner
    owner = owner.owner!
  } while (owner)
  return root
}

export function createStructure(config: {
  onStructureUpdate: Structure['onStructureUpdate']
  onComputationUpdates: Structure['onComputationUpdate']
  structureEnabled: () => boolean
}) {
  let treeWalkerMode: TreeWalkerMode = DEFAULT_WALKER_MODE

  const updateQueue = new Set<Solid.Owner>()
  /** root ids correcponding to owners in the update queue */
  const ownerRoots = new Map<Solid.Owner, NodeID>()
  const removedRoots = new Set<NodeID>()
  let shouldUpdateAllRoots = false

  const onComputationUpdate: ComputationUpdateHandler = (rootId, owner, changedStructure) => {
    // separate the callback from the computation
    queueMicrotask(() => {
      if (!config.structureEnabled()) return
      changedStructure && updateOwner(owner, rootId)
      config.onComputationUpdates(rootId, getSdtId(owner))
    })
  }

  function forceFlushRootUpdateQueue(): void {
    if (config.structureEnabled()) {
      const updated: StructureUpdates['updated'] = {}

      const [owners, getRootId] = shouldUpdateAllRoots
        ? [roots.getCurrentRoots(), (owner: Solid.Owner) => getSdtId(owner)]
        : [updateQueue, (owner: Solid.Owner) => ownerRoots.get(owner)!]
      shouldUpdateAllRoots = false

      for (const owner of owners) {
        const rootId = getRootId(owner)
        const tree = walkSolidTree(owner, {
          rootId,
          mode: treeWalkerMode,
          onComputationUpdate,
          registerComponent: registry.registerComponent,
        })
        const map = updated[rootId]
        if (map) map[tree.id] = tree
        else updated[rootId] = { [tree.id]: tree }
      }

      config.onStructureUpdate(updated, removedRoots)
    }
    updateQueue.clear()
    flushRootUpdateQueue.clear()
    removedRoots.clear()
    ownerRoots.clear()
  }
  const flushRootUpdateQueue = throttle(forceFlushRootUpdateQueue, 250)

  function updateOwner(node: Solid.Owner, topRootId: NodeID): void {
    updateQueue.add(node)
    ownerRoots.set(node, topRootId)
    flushRootUpdateQueue()
  }

  roots.setOnOwnerNeedsUpdate((node: Solid.Owner, topRootId: NodeID) => {
    const closestIncludedOwner = getClosestIncludedOwner(node, treeWalkerMode)
    closestIncludedOwner && updateOwner(closestIncludedOwner, topRootId)
  })

  roots.setOnRootRemoved((rootId: NodeID) => {
    removedRoots.add(rootId)
    flushRootUpdateQueue()
  })

  function updateAllRoots(): void {
    shouldUpdateAllRoots = true
    flushRootUpdateQueue()
  }

  function forceUpdateAllRoots(): void {
    shouldUpdateAllRoots = true
    queueMicrotask(forceFlushRootUpdateQueue)
  }

  function setTreeWalkerMode(mode: TreeWalkerMode): void {
    treeWalkerMode = mode
    updateAllRoots()
    registry.clearComponentRegistry()
  }

  return {
    updateAllRoots,
    forceUpdateAllRoots,
    setTreeWalkerMode,
    getClosestIncludedOwner(owner: Solid.Owner) {
      return getClosestIncludedOwner(owner, treeWalkerMode)
    },
  }
}
