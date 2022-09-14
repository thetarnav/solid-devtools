import { structure, inspector, Structure } from "@/state"
import { OwnerPath, Scrollable } from "@/ui"
import { NodeID } from "@solid-devtools/shared/graph"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import {
  Accessor,
  Component,
  createContext,
  createEffect,
  createMemo,
  createRoot,
  JSX,
  Setter,
  Show,
  useContext,
} from "solid-js"
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

// const TreeNode: Component<{ owner: Structure.Owner; level: number }> = props => {
//   return (
//     <div>
//       <OwnerNode owner={props.owner} level={props.level} />
//       <div
//         class={styles.children}
//         style={{
//           opacity: isUpdated() ? 0.3 : 1,
//         }}
//       >
//         <TransitionGroup enter={animateEnter()} exit={animateExit()}>
//           <For each={children()}>{o => <OwnerNode owner={o} level={level + 1} />}</For>
//         </TransitionGroup>
//       </div>
//     </div>
//   )
// }

// const ForTreeNodes: Component<{ tree: TreeNode[]; level: number }> = props => {
//   return () =>
//     props.tree.map(node => (
//       <div class={styles.node} style={assignInlineVars({ [styles.levelVar]: props.level + "" })}>
//         {node.rendered}
//         <div class={styles.children}>
//           <ForTreeNodes tree={node.children} level={props.level + 1} />
//         </div>
//       </div>
//     ))
// }

// export function TreeNode(props: { owner: Structure.Owner; level: number }): JSX.Element {
//   const { owner, level } = props
//   return (
//     <div class={styles.container} style={assignInlineVars({ [styles.levelVar]: level + "" })}>
//       <OwnerNode owner={props.owner} />
//       <div
//         class={styles.childrenContainer}
//       >
//         <TransitionGroup enter={animateEnter()} exit={animateExit()}>
//           <For each={children()}>{o => <OwnerNode owner={o} level={level + 1} />}</For>
//         </TransitionGroup>
//       </div>
//     </div>
//   )
// }

type TreeNode = {
  id: NodeID
  rendered: JSX.Element
  dispose: VoidFunction
  children: TreeNode[]
  setChildren: Setter<TreeNode[]>
}

const OwnerTree: Component = () => {
  // createEffect(() => {
  //   console.log(JSON.stringify(structure.roots(), null, 2))
  // })

  return ""
  //   const vh = window.innerHeight
  //   const rowH = 1.25 * 16 // 1.25rem

  //   const tree = createMemo(() => {
  //     let i = 0
  //     const tree = [] as TreeNode[]

  //     function walkNode(owner: Structure.Owner): TreeNode {
  //       return createRoot(dispose => {
  //         const node: TreeNode = {
  //           id: owner.id,
  //           rendered: <OwnerNode owner={owner} />,
  //           dispose,
  //           children: owner.children.map(walkNode),
  //         }
  //         return node
  //       })
  //     }

  //     for (; i < structure.length; i++) {
  //       if (i * rowH > vh) break
  //       tree.push(walkNode(structure[i].tree))
  //     }

  //     return tree
  //   })

  //   return <ForTreeNodes tree={tree()} level={0} />
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
