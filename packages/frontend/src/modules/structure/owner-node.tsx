import { Badge, CollapseToggle, createHighlightedOwnerName, theme } from '@/ui'
import { createHover } from '@solid-devtools/shared/primitives'
import { Component } from 'solid-js'
import type { Structure } from '.'
import {
    background_gradient,
    padding_mask,
    path_height_class,
    row_height,
    row_padding,
} from './styles'

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
            class={`${path_height_class} relative flex items-center pr-4 cursor-pointer`}
            onClick={() => onInspectChange(!props.isSelected)}
            {...hoverProps}
        >
            <div
                class="absolute -z-1 inset-y-0 inset-x-1
                rounded bg-highlight-bg b b-solid b-highlight-border
                transition-opacity duration-100"
                style={{
                    opacity: props.isHovered ? 0.2 : props.isSelected ? 0.45 : 0,
                }}
            ></div>
            <div
                class="relative -z-2 ml-3.5"
                style={{
                    width: `calc(${props.owner.level} * ${row_padding} + ${theme.spacing[2]})`,
                    height: `calc(${row_height} + 0.95px)`,
                    background: background_gradient,
                    'mask-image': padding_mask,
                    '-webkit-mask-image': padding_mask,
                }}
            />
            <div class="relative flex items-center gap-x-2 min-w-36">
                <CollapseToggle
                    class="absolute -left-6 opacity-0 selected:opacity-100
                    before:content-empty before:absolute before:-z-2 before:inset-.5 before:rounded-full
                    before:bg-white dark:before:bg-gray-800 before:transition-background-color
                    hover:before:bg-panel-2"
                    style={{
                        left: `-${row_height}`,
                        opacity: props.isHovered || props.isSelected ? 1 : '',
                    }}
                    onToggle={() => toggleCollapsed(props.owner)}
                    collapsed={props.isCollapsed}
                />
                <OwnerName name={name} type={type} frozen={props.owner.frozen} />
                {hmr && <Badge>HMR</Badge>}
            </div>
        </div>
    )
}
