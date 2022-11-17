import { Component } from 'solid-js'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Badge, CollapseToggle, Highlight } from '@/ui'
import { useStructure } from './ctx'
import * as styles from './ownerNode.css'
import { createHover, createPingedSignal, trackFromListen } from '@solid-devtools/shared/primitives'
import type { Structure } from '.'
import { OwnerName } from '@/ui/components/Owner'

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
        <Highlight highlight={isUpdated()}>
          <OwnerName name={name} type={type} isFrozen={props.owner.frozen} />
        </Highlight>
        {hmr && <Badge>HMR</Badge>}
      </div>
    </div>
  )
}
