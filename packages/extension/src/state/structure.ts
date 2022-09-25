import { Accessor, batch, createRoot, createSelector, createSignal } from "solid-js"
import { Writable } from "type-fest"
import { Mapped, NodeID, NodeType, RootsUpdates } from "@solid-devtools/shared/graph"
import { createUpdatedSelector } from "./utils"

interface WritableNode {
  id: NodeID
  name: string
  type: NodeType
  parent: WritableNode | null
  children: WritableNode[]
  subroots?: WritableRootNode[]
  length: number
  hmr?: true
  collapsed?: boolean
}

interface WritableRootNode extends WritableNode {
  // TODO: it's the same as parent...
  attachedTo?: WritableNode
}

export namespace Structure {
  export interface Node extends Readonly<WritableNode> {
    readonly parent: Node | null
    readonly children: Node[]
  }

  export type Hovered = { readonly rootId: NodeID; readonly node: Node } | null
}

function pushToMapList<K, T>(map: Map<K, T[]>, key: K, value: T, index?: number): void {
  const list = map.get(key)
  if (list) {
    if (index === undefined) list.push(value)
    else list.splice(index, 0, value)
  } else map.set(key, [value])
}
function removeFromMapList<K, T>(map: Map<K, T[]>, key: K, value: T): number {
  const roots = map.get(key)
  if (!roots) return -1
  const index = roots.indexOf(value)
  if (index === -1) return -1
  roots.splice(index, 1)
  if (roots.length === 0) map.delete(key)
  return index
}

let $attachmentsRecord: Record<NodeID, Mapped.Root[]>
let $removed: Set<NodeID>
let $updated: Record<NodeID, Mapped.Root>
let $nodeMap: Record<NodeID, Record<NodeID, WritableNode>>

function reconcileNode(
  node: WritableNode,
  raw: Readonly<Mapped.Owner> | null,
  nodes: typeof $nodeMap[NodeID],
): void {
  const { id, length: prevLength } = node
  nodes[id] = node

  if (raw) {
    const prevChildrenRecord: Record<NodeID, WritableNode> = {}
    for (const child of node.children) prevChildrenRecord[child.id] = child
    // TODO: optimize: array length is probably known
    const newChildren: WritableNode[] = []
    const { children: rawChildren } = raw
    if (rawChildren)
      for (let i = 0; i < rawChildren.length; i++) {
        // TODO optimize: children can only be added
        const child = rawChildren[i]
        const childId = child.id
        const prevChild = prevChildrenRecord[childId]
        let newChild: WritableNode
        if (prevChild) {
          reconcileNode(prevChild, child, nodes)
          newChild = prevChild
          delete prevChildrenRecord[childId]
        } else {
          newChild = createNode(child, node, nodes)
        }
        newChildren.push(newChild)
      }
    // remove old children
    for (const { length } of Object.values(prevChildrenRecord)) node.length -= length + 1

    node.children = newChildren
  }
  // even if the node hasn't been updated, reconcile its children
  else {
    for (const child of node.children) {
      reconcileNode(child, null, nodes)
    }
  }

  // TODO: why creating new array?
  const subroots: WritableNode[] = []

  if (node.subroots) {
    for (const prevSubroot of node.subroots) {
      const attachedTo = prevSubroot.attachedTo
      if (attachedTo !== node) {
        node.length -= prevSubroot.length + 1
      } else {
        subroots.push(prevSubroot)
        const update = $updated[prevSubroot.id]?.tree ?? null
        reconcileNode(prevSubroot, update, $nodeMap[prevSubroot.id])
      }
    }
  }

  const newSubroots = $attachmentsRecord[id] as Mapped.Root[] | undefined
  if (newSubroots)
    for (let i = 0; i < newSubroots.length; i++) {
      const { tree, id: rootId } = newSubroots[i]
      subroots.push(createNode(tree, node, ($nodeMap[rootId] = {})))
    }
  node.subroots = subroots
  if (node.parent && !node.collapsed) node.parent.length += node.length - prevLength

  // TODO should parent be updated?
}

function createNode(
  raw: Readonly<Mapped.Owner>,
  parent: WritableNode | null,
  nodes: typeof $nodeMap[NodeID],
): WritableNode {
  const { id, name, type, children: rawChildren } = raw
  const children: WritableNode[] = Array(rawChildren ? rawChildren.length : 0)
  const node: Writable<WritableNode> = { id, name, type, children, parent, length: 0 }
  if (type === NodeType.Component && raw.hmr) node.hmr = true
  // map children
  if (rawChildren) {
    for (let ci = 0; ci < rawChildren.length; ci++) {
      const child = createNode(rawChildren[ci], node, nodes)
      children[ci] = child
    }
  }
  // map attached subroots
  const newSubroots = $attachmentsRecord[id] as Mapped.Root[] | undefined
  if (newSubroots) {
    const subroots: WritableNode[] = Array(newSubroots.length)
    for (let i = 0; i < newSubroots.length; i++) {
      const { tree, id: rootId } = newSubroots[i]
      const subroot = createNode(tree, node, ($nodeMap[rootId] = {})) as WritableRootNode
      subroots[i] = subroot
      subroot.attachedTo = node
    }
    node.subroots = subroots
  }

  if (parent) parent.length += node.length + 1
  return (nodes[id] = node)
}

export function reconcileStructure(config: {
  structure: WritableNode[]
  removed: readonly NodeID[]
  updated: Record<NodeID, Mapped.Root>
  nodeMap: typeof $nodeMap
}): WritableNode[] {
  const { structure, removed, updated, nodeMap } = config
  $attachmentsRecord = {}
  $updated = updated
  $nodeMap = nodeMap
  $removed = new Set(removed)

  const structureShape: (WritableNode | NodeID)[] = []

  let ni = 0
  for (const node of structure) {
    const { id } = node
    if ($removed.has(id)) delete $nodeMap[id]
    else structureShape[ni++] = node
  }

  for (const [id, root] of Object.entries(updated)) {
    const { attachedTo } = root
    const nodes = $nodeMap[id] as typeof $nodeMap[NodeID] | undefined
    // updated
    if (nodes) {
      const node = nodes[id] as WritableRootNode
      const prevAttachment = node.attachedTo
      // sub root
      if (attachedTo) {
        if (prevAttachment!.id !== attachedTo) {
          // add it to the attachments record
          if ($attachmentsRecord[attachedTo]) $attachmentsRecord[attachedTo].push(root)
          else $attachmentsRecord[attachedTo] = [root]
          delete node.attachedTo
        }
      }
      // top-level, but a subroot before
      else if (prevAttachment) {
        delete node.attachedTo
        structureShape[ni++] = node
      }
    }
    // added
    else {
      if (attachedTo) {
        // add it to the attachments record
        if ($attachmentsRecord[attachedTo]) $attachmentsRecord[attachedTo].push(root)
        else $attachmentsRecord[attachedTo] = [root]
      } else {
        structureShape[ni++] = id
      }
    }
  }

  const next: WritableNode[] = Array(ni)
  for (let i = 0; i < ni; i++) {
    const node = structureShape[i]
    // create new node
    if (typeof node === "string") {
      const id = node
      const { tree } = updated[node]
      next[i] = createNode(tree, null, ($nodeMap[id] = {}))
    }
    // reconcile existing node
    else {
      const { id } = node
      const prev = (updated[id] as Mapped.Root | undefined)?.tree ?? null
      // clear the nodemap for updated roots
      const nodes: typeof $nodeMap[NodeID] = prev ? $nodeMap[id] : ($nodeMap[id] = {})
      reconcileNode(node, prev, nodes)
      next[i] = node
    }
  }

  return next
}

function findNode(
  nodeMap: typeof $nodeMap,
  id: NodeID,
): { node: WritableNode; rootId: NodeID } | undefined {
  for (const [rootId, nodes] of Object.entries(nodeMap)) {
    const node = nodes[id]
    if (node) return { node, rootId }
  }
}

let $attachments: Map<NodeID, Mapped.Root[]>
let $mappedRoots: Map<NodeID, Mapped.Root>

function mapOwner(
  raw: Readonly<Mapped.Owner>,
  parent: Writable<WritableNode> | null,
  nodes: Record<NodeID, WritableNode>,
): WritableNode {
  const { id, name, type, children: rawChildren } = raw
  const subroots = $attachments.get(id)
  let ci = 0
  const children: WritableNode[] = Array(
    (rawChildren ? rawChildren.length : 0) + (subroots ? subroots.length : 0),
  )
  const node: Writable<WritableNode> = { id, name, type, children, parent, length: 0 }
  if (type === NodeType.Component && raw.hmr) node.hmr = true
  // map children
  if (rawChildren) {
    for (; ci < rawChildren.length; ci++) {
      const child = mapOwner(rawChildren[ci], node, nodes)
      children[ci] = child
    }
  }
  // map attached subroots
  if (subroots) {
    for (let i = 0; i < subroots.length; i++) {
      const { tree, id: rootId } = subroots[i]
      const nodes: Record<NodeID, WritableNode> = {}
      $nodeMap[rootId] = nodes
      const child = mapOwner(tree, node, nodes)
      children[ci + i] = child
    }
  }
  if (parent) parent.length += node.length + 1
  nodes[id] = node
  return node
}

export function collapseStructureNode(config: {
  node: Writable<WritableNode>
  collapsed: boolean
  attachments: typeof $attachments
  mappedRoots: typeof $mappedRoots
  nodeMap: typeof $nodeMap
}): boolean {
  const { node, collapsed, attachments, mappedRoots, nodeMap } = config
  $attachments = attachments
  $mappedRoots = mappedRoots
  $nodeMap = nodeMap

  const isCollapsed = !!node.collapsed
  if (isCollapsed === collapsed) return false

  node.collapsed = collapsed

  const { parent, length } = node
  if (!parent) return false

  let checkedNode = parent
  let prevLength = length
  while (true) {
    if (checkedNode.collapsed) break
    const { parent, length } = checkedNode

    checkedNode.length += collapsed ? -prevLength : prevLength
    prevLength = length

    if (!parent) break
    else checkedNode = parent
  }

  return true
}

export function mapStructureUpdates(config: {
  prev: readonly WritableNode[]
  removed: readonly NodeID[]
  updated: Record<NodeID, Mapped.Root>
  attachments: typeof $attachments
  mappedRoots: typeof $mappedRoots
}): { structure: WritableNode[]; nodeMap: typeof $nodeMap } {
  const { prev, removed, updated, attachments, mappedRoots } = config
  $attachments = attachments
  $mappedRoots = mappedRoots
  $nodeMap = {}

  const order: Mapped.Root[] = []

  for (const id of removed) {
    const mapped = $mappedRoots.get(id)!
    const { attachedTo } = mapped
    $mappedRoots.delete(id)
    if (attachedTo) removeFromMapList($attachments, attachedTo, mapped)
  }

  for (let i = 0; i < prev.length; i++) {
    const id = prev[i].id
    let mapped = $mappedRoots.get(id)
    // REMOVED top level roots
    if (!mapped) continue

    // UPDATED top level roots
    const updatedRoot = updated[id]
    if (updatedRoot) {
      $mappedRoots.set(id, (mapped = updatedRoot))
      delete updated[id]
    }

    order.push(mapped)
  }

  for (const mapped of Object.values(updated)) {
    const { id, attachedTo } = mapped
    const oldMapped = $mappedRoots.get(id)
    let index: number | undefined

    if (oldMapped) {
      // ATTACHED root
      const oldAttachedTo = oldMapped.attachedTo
      if (oldAttachedTo) {
        const _index = removeFromMapList($attachments, oldAttachedTo, oldMapped)
        // attach to the same parent to the same index
        if (oldAttachedTo === attachedTo) index = _index
      }
    }

    // ADDED roots
    $mappedRoots.set(id, mapped)
    if (attachedTo) pushToMapList($attachments, attachedTo, mapped, index)
    else order.push(mapped)
  }

  const next: WritableNode[] = Array(order.length)
  for (let i = 0; i < order.length; i++) {
    const { id, tree } = order[i]
    const prevNode = $nodeMap[id]?.[id] ?? null
    const nodes: Record<NodeID, WritableNode> = {}
    $nodeMap[id] = nodes
    next[i] = nodes[id] = mapOwner(tree, null, nodes)
  }
  return { structure: next, nodeMap: $nodeMap }
}

const structure = createRoot(() => {
  const [structure, setStructure] = createSignal<WritableNode[]>([])

  /** parent nodeId : rootId to be attached */
  const attachments: typeof $attachments = new Map()
  /** rootId : mappedRoot */
  const mappedRoots: typeof $mappedRoots = new Map()
  /** rootId : list of nodes down in the tree */
  let nodeMap: typeof $nodeMap = {}

  function updateStructure(updates: RootsUpdates): void {
    batch(() => {
      clearUpdatedComputations()
      setStructure(prev => {
        const { structure, nodeMap: nextNodeMap } = mapStructureUpdates({
          ...updates,
          prev,
          attachments,
          mappedRoots,
        })
        nodeMap = nextNodeMap
        return structure
      })
    })
  }

  function collapseNode(node: Structure.Node, collapsed: boolean): void {}

  const [isUpdated, addUpdatedComputations, clearUpdatedComputations] = createUpdatedSelector()

  const [hovered, setHovered] = createSignal<Structure.Hovered>(null)
  const isHovered = createSelector(hovered, (id: NodeID, o) => !!o && o.node.id === id)

  function toggleHoveredOwner(id: NodeID, hovered: boolean): Structure.Hovered {
    return setHovered(p => {
      if (hovered) return findNode(nodeMap, id) ?? p
      return p && p.node.id === id ? null : p
    })
  }

  function resetStructure() {
    mappedRoots.clear()
    attachments.clear()
    nodeMap = {}
    batch(() => {
      setStructure([])
      setHovered(null)
    })
  }

  return {
    structure: structure as Accessor<Structure.Node[]>,
    resetStructure,
    updateStructure,
    hovered,
    isHovered,
    addUpdatedComputations,
    isUpdated,
    toggleHoveredOwner,
    findNode: (nodeId: NodeID): ReturnType<typeof findNode> => findNode(nodeMap, nodeId),
    getNode: (rootId: NodeID, nodeId: NodeID): Structure.Node | undefined =>
      nodeMap[rootId]?.[nodeId],
  }
})
export default structure
