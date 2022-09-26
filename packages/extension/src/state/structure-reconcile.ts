import { Mapped, NodeID, NodeType, RootsUpdates } from "@solid-devtools/shared/graph"
import type { WritableNode } from "./structure"

let $nextNodeList: WritableNode[]
let $updatedAttached: Record<NodeID, Mapped.Root[]>
let $removedSet: Set<NodeID>
let $updated: Record<NodeID, Mapped.Root>

function updateNode(
  node: WritableNode,
  newNode: Mapped.Owner | undefined,
  level: number,
): WritableNode {
  const { id, subroots, children } = node
  $nextNodeList.push(node)
  node.level = level

  if (newNode) {
    const { children: rawChildren } = newNode
    const newChildren: WritableNode[] = (node.children = [])

    if (rawChildren) {
      const prevChildrenRecord: Record<NodeID, WritableNode> = {}
      for (const child of children) prevChildrenRecord[child.id] = child

      for (const child of rawChildren) {
        const prevChild = prevChildrenRecord[child.id] as WritableNode | undefined
        newChildren.push(
          prevChild ? updateNode(prevChild, child, level + 1) : createNode(child, node, level + 1),
        )
      }
    }
  } else {
    for (const child of children) updateNode(child, undefined, level + 1)
  }

  const newSubroots: WritableNode[] = []
  const newAttached = $updatedAttached[id] as Mapped.Root[] | undefined
  let subRootIds: Set<NodeID> | null = subroots && newAttached ? new Set() : null

  if (subroots) {
    let updatedSubroot: Mapped.Root | undefined
    for (const subroot of subroots) {
      const subrootId = subroot.id
      if ($removedSet.has(subrootId)) continue
      if ((updatedSubroot = $updated[subrootId])) {
        if (updatedSubroot.attachedTo !== id) continue
        if (subRootIds) subRootIds.add(subrootId)
      }
      newSubroots.push(updateNode(subroot, updatedSubroot?.tree, level + 1))
    }
  }

  if (newAttached) {
    for (const { tree, id: subrootId } of newAttached) {
      if (subRootIds && subRootIds.has(subrootId)) continue
      newSubroots.push(createNode(tree, node, level + 1))
    }
  }

  if (newSubroots.length) node.subroots = newSubroots
  else delete node.subroots

  return node
}

function createNode(raw: Mapped.Owner, parent: WritableNode | null, level: number): WritableNode {
  const { id, name, type, children: rawChildren } = raw

  const children: WritableNode[] = []
  const node: WritableNode = { id, name, type, children, parent, level }
  if (type === NodeType.Component && raw.hmr) node.hmr = true
  $nextNodeList.push(node)

  // map children
  if (rawChildren) {
    for (const child of rawChildren) children.push(createNode(child, node, level + 1))
  }
  // map attached subroots
  const newAttached = $updatedAttached[id] as Mapped.Root[] | undefined
  if (newAttached) {
    const subroots: WritableNode[] = (node.subroots = [])
    for (const subroot of newAttached) {
      subroots.push(createNode(subroot.tree, node, level + 1))
    }
  }

  return node
}

export function reconcileStructure(
  roots: WritableNode[],
  updated: RootsUpdates["updated"],
  removed: RootsUpdates["removed"],
): { roots: WritableNode[]; nodeList: WritableNode[] } {
  $updated = updated
  $removedSet = new Set(removed)
  const added: Record<NodeID, Mapped.Owner> = {}
  $updatedAttached = {}

  for (const root of Object.values(updated)) {
    const { attachedTo, tree, id } = root
    if (attachedTo) {
      if ($updatedAttached[attachedTo]) $updatedAttached[attachedTo].push(root)
      else $updatedAttached[attachedTo] = [root]
    } else added[id] = tree
  }

  const nextRoots: WritableNode[] = []
  $nextNodeList = []

  for (const root of roots) {
    const { id } = root
    if ($removedSet.has(id)) continue
    delete added[id]
    nextRoots.push(updateNode(root, updated[id]?.tree, 0))
  }

  for (const root of Object.values(added)) {
    nextRoots.push(createNode(root, null, 0))
  }

  return { roots: nextRoots, nodeList: $nextNodeList }
}
