import { Mapped, NodeID, NodeType, RootsUpdates } from "@solid-devtools/shared/graph"
import type { Structure } from "./structure"

let $nextNodeList: Structure.Node[]
let $updatedAttached: Record<NodeID, Mapped.Root[]>
let $removedSet: Set<NodeID>
let $updated: Record<NodeID, Mapped.Root>

function updateNode(
  node: Structure.Node,
  raw: Mapped.Owner | Mapped.Root | undefined,
  level: number,
): Structure.Node {
  const { id, subroots, children } = node
  $nextNodeList.push(node)
  node.level = level

  if (raw) {
    // update frozen computations
    if (raw.type !== NodeType.Root && raw.type !== NodeType.Component && raw.frozen)
      node.frozen = true

    const { children: rawChildren } = raw
    const newChildren: Structure.Node[] = (node.children = [])

    if (rawChildren) {
      const prevChildrenRecord: Record<NodeID, Structure.Node> = {}
      for (const child of children) prevChildrenRecord[child.id] = child

      for (const child of rawChildren) {
        const prevChild = prevChildrenRecord[child.id] as Structure.Node | undefined
        newChildren.push(
          prevChild ? updateNode(prevChild, child, level + 1) : createNode(child, node, level + 1),
        )
      }
    }
  } else {
    for (const child of children) updateNode(child, undefined, level + 1)
  }

  const newSubroots: Structure.Node[] = []
  const newAttached = $updatedAttached[id] as Mapped.Root[] | undefined
  let subRootIds: Set<NodeID> | null = subroots && newAttached ? new Set() : null

  if (subroots) {
    let updatedSubroot: Mapped.Root | undefined
    for (const subroot of subroots) {
      const subrootId = subroot.id
      if ($removedSet.has(subrootId)) continue
      if ((updatedSubroot = $updated[subrootId])) {
        if (updatedSubroot.attached !== id) continue
        if (subRootIds) subRootIds.add(subrootId)
      }
      newSubroots.push(updateNode(subroot, updatedSubroot, level + 1))
    }
  }

  if (newAttached) {
    for (const subroot of newAttached) {
      if (subRootIds && subRootIds.has(subroot.id)) continue
      newSubroots.push(createNode(subroot, node, level + 1))
    }
  }

  if (newSubroots.length) node.subroots = newSubroots
  else delete node.subroots

  return node
}

function createNode(
  raw: Mapped.Owner | Mapped.Root,
  parent: Structure.Node | null,
  level: number,
): Structure.Node {
  const { id, name, type, children: rawChildren } = raw

  const children: Structure.Node[] = []
  const node: Structure.Node = { id, type, children, parent, level }

  if (name) node.name = name
  if (type === NodeType.Component) node.hmr = raw.hmr
  else if (type !== NodeType.Root && raw.frozen) node.frozen = true

  $nextNodeList.push(node)

  // map children
  if (rawChildren) {
    for (const child of rawChildren) children.push(createNode(child, node, level + 1))
  }
  // map attached subroots
  const newAttached = $updatedAttached[id] as Mapped.Root[] | undefined
  if (newAttached) {
    const subroots: Structure.Node[] = (node.subroots = [])
    for (const subroot of newAttached) {
      subroots.push(createNode(subroot, node, level + 1))
    }
  }

  return node
}

export function reconcileStructure(
  roots: Structure.Node[],
  updated: RootsUpdates["updated"],
  removed: RootsUpdates["removed"],
): { roots: Structure.Node[]; nodeList: Structure.Node[] } {
  $updated = updated
  $removedSet = new Set(removed)
  const added: Record<NodeID, Mapped.Root> = {}
  $updatedAttached = {}

  for (const root of Object.values(updated)) {
    const { attached, id } = root
    if (attached) {
      if ($updatedAttached[attached]) $updatedAttached[attached].push(root)
      else $updatedAttached[attached] = [root]
    } else added[id] = root
  }

  const nextRoots: Structure.Node[] = []
  $nextNodeList = []

  for (const root of roots) {
    const { id } = root
    if ($removedSet.has(id)) continue
    delete added[id]
    nextRoots.push(updateNode(root, updated[id], 0))
  }

  for (const root of Object.values(added)) {
    nextRoots.push(createNode(root, null, 0))
  }

  return { roots: nextRoots, nodeList: $nextNodeList }
}
