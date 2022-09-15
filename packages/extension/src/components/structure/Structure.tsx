import { structure, inspector, Structure } from "@/state"
import { OwnerPath, Scrollable } from "@/ui"
import { NodeID } from "@solid-devtools/shared/graph"
import { Key } from "@solid-primitives/keyed"
import {
  Accessor,
  batch,
  Component,
  createContext,
  createMemo,
  createRoot,
  createSignal,
  JSX,
  Setter,
  Show,
  untrack,
  useContext,
} from "solid-js"
import { OwnerNode } from "./OwnerNode"
import * as styles from "./structure.css"

export type StructureContextState = {
  handleFocus: (owner: Structure.Node | null) => void
  useUpdatedSelector: (id: NodeID) => Accessor<boolean>
  useSelectedSelector: (owner: Structure.Node) => Accessor<boolean>
  toggleHoveredOwner: (owner: Structure.Node, hovered: boolean) => void
  useHoveredSelector: (id: NodeID) => Accessor<boolean>
}

const StructureContext = createContext<StructureContextState>()

export const useStructure = () => {
  const ctx = useContext(StructureContext)
  if (!ctx) throw "GraphContext wasn't provided."
  return ctx
}

type TreeNode = {
  id: NodeID
  rendered: JSX.Element
  dispose: VoidFunction
  setChildren: Setter<TreeNode[]>
  children: Accessor<TreeNode[]>
}

function disposeTreeNode(node: TreeNode) {
  for (const child of node.children()) disposeTreeNode(child)
  node.dispose()
}

const ForTreeNodes: Component<{ nodes: TreeNode[] }> = props => {
  return (
    <Key each={props.nodes} by="id">
      {node => node().rendered}
    </Key>
  )
}

function createNode(node: Structure.Node, level: number): TreeNode {
  return createRoot(dispose => {
    const [children, setChildren] = createSignal<TreeNode[]>(
      node.children.map(o => createNode(o, level + 1)),
    )
    const treeNode: TreeNode = {
      id: node.id,
      rendered: (
        <OwnerNode owner={node} level={level}>
          <ForTreeNodes nodes={children()} />
        </OwnerNode>
      ),
      dispose,
      setChildren,
      children,
    }

    return treeNode
  })
}

function reconcileNodes(nodes: TreeNode[], newNodes: Structure.Node[], level: number): TreeNode[] {
  const prevMap: Record<NodeID, TreeNode> = {}
  for (const node of nodes) prevMap[node.id] = node

  const next: TreeNode[] = Array(newNodes.length)
  for (let i = 0; i < newNodes.length; i++) {
    const node = newNodes[i]
    const id = node.id
    const prevNode = prevMap[id]
    if (prevNode) {
      // UPDATED
      next[i] = prevNode
      prevNode.setChildren(prev => reconcileNodes(prev, node.children, level + 1))
      delete prevMap[id]
    }
    // ADDED
    else next[i] = createNode(node, level)
  }

  // REMOVED
  for (const node of Object.values(prevMap)) disposeTreeNode(node)

  return next
}

const OwnerTree: Component = () => {
  const vh = window.innerHeight
  const rowH = 1.25 * 16 // 1.25rem

  const tree = createMemo<TreeNode[]>((prevTree = []) => {
    const rootsList = structure.roots()

    return untrack(() => batch(() => reconcileNodes(prevTree, rootsList, 0)))
  })

  return <ForTreeNodes nodes={tree()} />
}

export default function StructureView() {
  return (
    <div class={styles.wrapper}>
      <StructureContext.Provider
        value={{
          handleFocus: inspector.setSelectedNode,
          // TODO
          useUpdatedSelector: () => () => false,
          useSelectedSelector: inspector.useOwnerSelectedSelector,
          // TODO
          toggleHoveredOwner: () => {},
          // TODO
          useHoveredSelector: () => () => false,
        }}
      >
        <Scrollable>
          <OwnerTree />
        </Scrollable>
      </StructureContext.Provider>
      <div class={styles.path}>
        <div class={styles.pathInner}>
          <Show when={inspector.details()?.path}>
            <OwnerPath path={inspector.details()!.path} />
          </Show>
        </div>
      </div>
    </div>
  )
}
