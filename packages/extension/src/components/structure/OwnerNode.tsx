import { Component, onCleanup } from "solid-js"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { NodeType } from "@solid-devtools/shared/graph"
import { structure, Structure } from "@/state"
import { Highlight } from "@/ui"
import { useStructure } from "./Structure"
import * as styles from "./OwnerNode.css"

export const OwnerNode: Component<{
  owner: Structure.Node
  level: number
}> = props => {
  const { owner } = props
  const { name, type, id } = owner
  const typeName = NodeType[type]

  const { useSelectedSelector, handleFocus } = useStructure()
  const { toggleHoveredOwner } = structure

  const isSelected = useSelectedSelector(owner)
  const isHovered = structure.isHovered.bind(null, id)
  const isUpdated = structure.isUpdated.bind(null, id)

  onCleanup(() => {
    isSelected() && handleFocus(null)
    toggleHoveredOwner(id, false)
  })

  return (
    <div
      data-hovered={isHovered()}
      data-selected={isSelected()}
      class={styles.contailer}
      onClick={e => handleFocus(isSelected() ? null : owner)}
      onMouseEnter={() => toggleHoveredOwner(id, true)}
      // onMouseLeave is fired in the next tick for the onMouseEnter of other node fired earlier
      onMouseLeave={() => setTimeout(() => toggleHoveredOwner(id, false))}
      style={assignInlineVars({ [styles.levelVar]: props.level + "" })}
    >
      <div class={styles.selection}></div>
      <div class={styles.levelPadding} />
      <div class={styles.nameContainer}>
        {/* TODO: observers and sources highlighting */}
        <Highlight strong={isUpdated()} light={false} class={styles.highlight}>
          <div class={styles.name}>{type === NodeType.Component ? `<${name}>` : name}</div>
        </Highlight>
        <div class={styles.type}>{typeName}</div>
      </div>
    </div>
  )
}
