import { For, JSX, onCleanup } from "solid-js"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
import { Graph, NodeType } from "@solid-devtools/shared/graph"
import { useStructure } from "~/ctx/structure"
import * as styles from "./OwnerNode.css"
import { Highlight } from "../highlight/Highlight"
import { assignInlineVars } from "@vanilla-extract/dynamic"

export function OwnerNode(props: { owner: Graph.Owner; level: number }): JSX.Element {
  const { owner, level } = props
  const { name, type, id } = owner
  const children = () => owner.children
  const typeName = NodeType[type]

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
    <div class={styles.container} style={assignInlineVars({ [styles.levelVar]: level + "" })}>
      <div
        data-hovered={isHovered()}
        data-selected={isSelected()}
        class={styles.header.contailer}
        onClick={e => handleFocus(isSelected() ? null : owner)}
        onMouseEnter={() => toggleHoveredOwner(owner, true)}
        onMouseLeave={() => toggleHoveredOwner(owner, false)}
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
      <div
        class={styles.childrenContainer}
        style={{
          opacity: isUpdated() ? 0.3 : 1,
        }}
      >
        <TransitionGroup enter={animateEnter()} exit={animateExit()}>
          <For each={children()}>{o => <OwnerNode owner={o} level={level + 1} />}</For>
        </TransitionGroup>
      </div>
    </div>
  )
}
