import { Component, JSX, onCleanup } from "solid-js"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { NodeType } from "@solid-devtools/shared/graph"
import { Structure } from "@/state"
import { useStructure } from "@/components/Structure"
import { Highlight } from "../highlight/Highlight"
import * as styles from "./OwnerNode.css"

export const OwnerNode: Component<{
  owner: Structure.Node
  children: JSX.Element
  level: number
}> = props => {
  const { owner } = props
  const { name, type, id } = owner
  const typeName = NodeType[type]

  console.log("render", name)

  const {
    useUpdatedSelector,
    useSelectedSelector,
    handleFocus,
    toggleHoveredOwner,
    useHoveredSelector,
  } = useStructure()

  const isUpdated = type !== NodeType.Root ? useUpdatedSelector(id) : () => false

  const isSelected = useSelectedSelector(owner)
  onCleanup(() => isSelected() && handleFocus(null))

  const isHovered = useHoveredSelector(id)
  onCleanup(() => toggleHoveredOwner(owner, false))

  return (
    <div class={styles.container} style={assignInlineVars({ [styles.levelVar]: props.level + "" })}>
      <div
        data-hovered={isHovered()}
        data-selected={isSelected()}
        class={styles.header.contailer}
        onClick={e => handleFocus(isSelected() ? null : owner)}
        onMouseEnter={() => toggleHoveredOwner(owner, true)}
        // onMouseLeave is fired in the next tick for the onMouseEnter of other node fired earlier
        onMouseLeave={() => setTimeout(() => toggleHoveredOwner(owner, false))}
      >
        <div class={styles.header.selection}></div>
        <div class={styles.header.nameContainer}>
          {/* TODO: observers and sources highlighting */}
          <Highlight strong={isUpdated()} light={false} class={styles.header.highlight}>
            <div class={styles.header.name}>{type === NodeType.Component ? `<${name}>` : name}</div>
          </Highlight>
          <div class={styles.header.type}>{typeName}</div>
        </div>
      </div>
      <div class={styles.children}>{props.children}</div>
    </div>
  )
}

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
