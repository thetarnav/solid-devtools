import { throttle } from '@solid-primitives/scheduled'
import * as registry from '../main/componentRegistry'
import { DEFAULT_WALKER_MODE, TreeWalkerMode } from '../main/constants'
import * as roots from '../main/roots'
import { Mapped, NodeID, Solid } from '../main/types'
import { markNodeID } from '../main/utils'
import { ComputationUpdateHandler, getClosestIncludedOwner, walkSolidTree } from './walker'

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
    if (!config.structureEnabled()) return
    changedStructure && updateOwner(owner, rootId)
    queueMicrotask(
      () => config.structureEnabled() && config.onComputationUpdates(rootId, markNodeID(owner)),
    )
  }

  function forceFlushRootUpdateQueue(): void {
    if (config.structureEnabled()) {
      const updated: StructureUpdates['updated'] = {}

      const [owners, getRootId] = shouldUpdateAllRoots
        ? [roots.getCurrentRoots(), (owner: Solid.Owner) => markNodeID(owner)]
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

  return { updateAllRoots, forceUpdateAllRoots, setTreeWalkerMode }
}
