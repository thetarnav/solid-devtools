import { Component } from 'solid-js'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { NodeType } from '@solid-devtools/debugger/types'
import { Badge, CollapseToggle, Highlight, Icon } from '@/ui'
import { useStructure } from './ctx'
import * as styles from './ownerNode.css'
import { createHover, createPingedSignal, trackFromListen } from '@solid-devtools/shared/primitives'
import type { Structure } from '.'

export const NodeTypeIcon: Component<{ type: NodeType; class?: string }> = props => {
  const IconComponent: Icon.IconComponent | null = (() => {
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
  owner: Structure.Node
  isHovered: boolean
  isSelected: boolean
  onHoverChange(hovered: boolean): void
  onInspectChange(inspect: boolean): void
  listenToUpdate(cb: VoidFunction): VoidFunction
}> = props => {
  const { onHoverChange, listenToUpdate, onInspectChange } = props
  const owner = props.owner
  const { name, type, hmr } = owner

  const ctx = useStructure()
  const { toggleCollapsed } = ctx
  const isCollapsed = ctx.isCollapsed.bind(null, owner)

  const isUpdated = createPingedSignal(trackFromListen(listener => listenToUpdate(listener)))

  const hoverProps = createHover(onHoverChange)

  return (
    <div
      data-hovered={props.isHovered}
      data-selected={props.isSelected}
      data-frozen={props.owner.frozen}
      class={styles.container}
      onClick={() => onInspectChange(!props.isSelected)}
      {...hoverProps}
      style={assignInlineVars({ [styles.levelVar]: props.owner.level + '' })}
    >
      <div class={styles.selection}></div>
      <div class={styles.levelPadding} />
      <div class={styles.nameContainer}>
        <CollapseToggle
          class={styles.collapse}
          onToggle={() => toggleCollapsed(owner)}
          isCollapsed={isCollapsed()}
        />
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
