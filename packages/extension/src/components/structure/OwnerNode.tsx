import { Accessor, Component } from "solid-js"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { NodeType } from "@solid-devtools/shared/graph"
import { structure, Structure, inspector } from "@/state"
import { Badge, Highlight, Icon } from "@/ui"
import { useStructure } from "./ctx"
import * as styles from "./ownerNode.css"
import { createHover } from "@solid-devtools/shared/primitives"

export const NodeTypeIcon: Component<{ type: NodeType; class?: string }> = props => {
  const IconComponent: Icon.IconComponent | null = (() => {
    console.log(props.type, NodeType.Context)
    switch (props.type) {
      case NodeType.Memo:
        return Icon.Memo
      case NodeType.Effect:
        return Icon.Effect
      case NodeType.Root:
        return Icon.Root
      case NodeType.Render:
        return Icon.RenderEffect
      case NodeType.Computation:
        return Icon.Computation
      case NodeType.Context:
        return Icon.Context
      default:
        return null
    }
  })()

  return IconComponent && <IconComponent class={props.class} />
}

export const OwnerNode: Component<{
  getOwner: Accessor<Structure.Node>
}> = ({ getOwner }) => {
  const owner = getOwner()
  const { name, type, id, hmr } = owner

  const ctx = useStructure()
  const { toggleCollapsed } = ctx
  const isCollapsed = ctx.isCollapsed.bind(null, owner)

  const { toggleHoveredOwner } = structure

  const isSelected = inspector.isNodeInspected.bind(null, id)
  const isHovered = structure.isHovered.bind(null, id)
  const isUpdated = structure.isUpdated.bind(null, id)

  return (
    <div
      data-hovered={isHovered()}
      data-selected={isSelected()}
      data-frozen={getOwner().frozen}
      class={styles.container}
      onClick={e => inspector.setInspectedNode(isSelected() ? null : owner)}
      {...createHover(hovering => toggleHoveredOwner(id, hovering))}
      style={assignInlineVars({ [styles.levelVar]: getOwner().level + "" })}
    >
      <div class={styles.selection}></div>
      <div class={styles.levelPadding} />
      <div class={styles.nameContainer}>
        <button
          class={styles.collapse}
          aria-selected={isCollapsed()}
          onClick={e => {
            e.stopPropagation()
            toggleCollapsed(owner)
          }}
        >
          <Icon.Triangle class={styles.collapseIcon} />
        </button>
        {/* TODO: observers and sources highlighting */}
        <Highlight strong={isUpdated()} light={false} class={styles.highlight}>
          <>
            <NodeTypeIcon type={type} class={styles.typeIcon} />
            {() => {
              switch (type) {
                case NodeType.Root:
                case NodeType.Context:
                  return <div class={styles.type}>{NodeType[type]}</div>
                case NodeType.Render:
                  return <div class={styles.type}>Render Effect</div>
                case NodeType.Component:
                  return <div class={styles.name}>{`<${name}>`}</div>
                default:
                  return <div class={styles.name}>{name}</div>
              }
            }}
          </>
        </Highlight>
        {hmr && <Badge>HMR</Badge>}
      </div>
    </div>
  )
}
