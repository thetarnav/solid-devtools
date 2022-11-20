import { Component } from 'solid-js'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Badge, CollapseToggle, Highlight } from '@/ui'
import * as styles from './ownerNode.css'
import { createHover, createPingedSignal, trackFromListen } from '@solid-devtools/shared/primitives'
import type { Structure } from '.'
import { OwnerName } from '@/ui/components/Owner'

export const OwnerNode: Component<{
  owner: Structure.Node
  isHovered: boolean
  isSelected: boolean
  isCollapsed: boolean
  onHoverChange(hovered: boolean): void
  onInspectChange(inspect: boolean): void
  listenToUpdate(cb: VoidFunction): VoidFunction
  toggleCollapsed: (node: Structure.Node) => void
}> = props => {
  const { onHoverChange, listenToUpdate, onInspectChange } = props
  const owner = props.owner
  const { name, type, hmr } = owner

  const { toggleCollapsed } = props

  const isUpdated = createPingedSignal(trackFromListen(listener => listenToUpdate(listener)))

  const hoverProps = createHover(onHoverChange)

  return (
    <div
      data-hovered={props.isHovered}
      data-selected={props.isSelected}
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
          isCollapsed={props.isCollapsed}
        />
        <Highlight highlight={isUpdated()}>
          <OwnerName name={name} type={type} isFrozen={props.owner.frozen} />
        </Highlight>
        {hmr && <Badge>HMR</Badge>}
      </div>
    </div>
  )
}
