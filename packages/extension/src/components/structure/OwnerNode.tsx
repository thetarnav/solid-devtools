import { Component, onCleanup } from "solid-js"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { NodeType } from "@solid-devtools/shared/graph"
import { structure, Structure, inspector } from "@/state"
import { Badge, Highlight } from "@/ui"
import { useStructure } from "./ctx"
import * as styles from "./ownerNode.css"

export const OwnerNode: Component<{
  owner: Structure.Node
  level: number
}> = props => {
  const { owner } = props
  const { name, type, id, hmr } = owner
  const typeName = NodeType[type]

  const ctx = useStructure()
  const { toggleCollapsed } = ctx
  const isCollapsed = ctx.isCollapsed.bind(null, owner)

  const { toggleHoveredOwner } = structure

  const isSelected = inspector.isNodeInspected.bind(null, id)
  const isHovered = structure.isHovered.bind(null, id)
  const isUpdated = structure.isUpdated.bind(null, id)

  onCleanup(() => {
    toggleHoveredOwner(id, false)
  })

  return (
    <div
      data-hovered={isHovered()}
      data-selected={isSelected()}
      class={styles.contailer}
      onClick={e => {
        inspector.setInspectedNode(isSelected() ? null : owner)
        toggleCollapsed(owner)
      }}
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
        {type !== NodeType.Component && <div class={styles.type}>{typeName}</div>}
        {hmr && <Badge>HMR</Badge>}
        {isCollapsed() && <Badge>Collapsed</Badge>}
      </div>
    </div>
  )
}
