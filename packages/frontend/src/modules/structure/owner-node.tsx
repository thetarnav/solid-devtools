import { Badge, CollapseToggle, createHighlightedOwnerName } from '@/ui'
import { createHover } from '@solid-devtools/shared/primitives'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Component } from 'solid-js'
import type { Structure } from '.'
import * as styles from './owner-node.css'

export const OwnerNode: Component<{
    owner: Structure.Node
    isHovered: boolean
    isSelected: boolean
    isCollapsed: boolean
    onHoverChange(hovered: boolean): void
    onInspectChange(inspect: boolean): void
    listenToUpdate(cb: VoidFunction): VoidFunction
    toggleCollapsed(node: Structure.Node): void
}> = props => {
    const { onHoverChange, listenToUpdate, onInspectChange } = props
    const { name, type, hmr } = props.owner

    const { toggleCollapsed } = props

    const { pingUpdated, OwnerName } = createHighlightedOwnerName()
    listenToUpdate(pingUpdated)

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
                    onToggle={() => toggleCollapsed(props.owner)}
                    isCollapsed={props.isCollapsed}
                />
                <OwnerName name={name} type={type} isFrozen={props.owner.frozen} />
                {hmr && <Badge>HMR</Badge>}
            </div>
        </div>
    )
}
