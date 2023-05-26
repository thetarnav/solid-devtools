import { Mapped, NodeID, NodeType, StructureUpdates } from '@solid-devtools/debugger/types'
import { entries } from '@solid-primitives/utils'
import type { Structure } from '.'

let Updated: StructureUpdates['updated']
let NewNodeList: Structure.Node[]

function createNode(
  raw: Mapped.Owner,
  parent: Structure.Node | null,
  level: number,
): Structure.Node {
  const { id, name, type, children: rawChildren } = raw

  const children: Structure.Node[] = []
  const node: Structure.Node = { id, type, children, parent, level }

  if (name) node.name = name
  if (type === NodeType.Component && raw.hmr) node.hmr = raw.hmr
  else if (type !== NodeType.Root && raw.frozen) node.frozen = true

  NewNodeList.push(node)

  // map children
  for (const child of rawChildren) children.push(createNode(child, node, level + 1))

  return node
}

function updateNode(
  node: Structure.Node,
  rootId: NodeID,
  raw: Mapped.Owner | undefined,
  level: number,
): Structure.Node {
  const { id, children } = node
  NewNodeList.push(node)
  node.level = level

  if (!raw) raw = Updated[rootId]?.[id]

  if (raw) {
    // update frozen computations
    if ('frozen' in raw && raw.frozen) node.frozen = true

    const { children: rawChildren } = raw
    const newChildren: Structure.Node[] = (node.children = [])

    if (rawChildren.length) {
      const prevChildrenMap: Record<NodeID, Structure.Node> = {}
      for (const child of children) prevChildrenMap[child.id] = child

      for (const childRaw of rawChildren) {
        const childNode = prevChildrenMap[childRaw.id]
        newChildren.push(
          childNode
            ? updateNode(childNode, rootId, childRaw, level + 1)
            : createNode(childRaw, node, level + 1),
        )
      }
    }
  } else {
    for (const child of children) {
      updateNode(child, rootId, Updated[rootId]?.[child.id], level + 1)
    }
  }

  return node
}

function reconcileStructure(
  prevRoots: Structure.Node[],
  { removed, updated, partial }: StructureUpdates,
): Structure.State {
  Updated = updated
  NewNodeList = []
  const nextRoots: Structure.Node[] = []

  const upatedTopLevelRoots = new Set<NodeID>()
  for (const root of prevRoots) {
    const { id } = root
    // skip removed roots for partial updates
    // and for full updates skip roots that were not sent
    if (partial ? removed.includes(id) : !(id in Updated)) continue
    upatedTopLevelRoots.add(id)
    nextRoots.push(updateNode(root, id, Updated[id]?.[id], 0))
  }

  for (const [rootId, updatedNodes] of entries(Updated)) {
    const root = updatedNodes![rootId]
    if (!root || upatedTopLevelRoots.has(rootId)) continue
    nextRoots.push(createNode(root, null, 0))
  }

  return { roots: nextRoots, nodeList: NewNodeList }
}

export { reconcileStructure }
