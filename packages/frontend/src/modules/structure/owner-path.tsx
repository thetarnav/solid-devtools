import { useController } from '@/controller'
import { Icon, styles, theme } from '@/ui'
import { Node_Type_Icon } from '@/ui/components/owner-name'
import { NodeType, UNKNOWN } from '@solid-devtools/debugger/types'
import { createHover } from '@solid-devtools/shared/primitives'
import { createElementSize } from '@solid-primitives/resize-observer'
import { useRemSize } from '@solid-primitives/styles'
import { Component, createMemo } from 'solid-js'
import { useStructure } from './structure-tree'
import { path_height_class, path_height_in_rem, path_min_height_class } from './styles'

export const OwnerPath: Component = () => {
    const { inspector, hovered } = useController()
    const structure = useStructure()

    let container!: HTMLDivElement
    const rem = useRemSize()
    const containerSize = createElementSize(() => container)
    const expandable = () => (containerSize.height ?? 0) > rem() * path_height_in_rem

    const path = createMemo(() => {
        const node = structure.inspectedNode()
        return node ? structure.getNodePath(node) : []
    })

    return (
        <div class={`relative w-full shrink-0 flex ${path_height_class}`}>
            <div
                class={`group
                absolute z-1 bottom-0 inset-x-0 w-full p-y-.25 p-x-2
                overflow-hidden box-border flex items-end
                bg-panel-bg b-t b-solid b-panel-border
                ${path_height_class} ${path_min_height_class}
                hover:h-auto hover:pt-.5`}
            >
                {expandable() && (
                    <div
                        class="absolute z-2 inset-0 p-l-3
                        flex items-center pointer-events-none
                        group-hover:opacity-0"
                        style={{
                            'background-image': `linear-gradient(to right, ${theme.vars.panel.bg} ${theme.spacing[8]}, transparent ${theme.spacing[32]})`,
                        }}
                    >
                        <Icon.Options class="w-3 h3 text-disabled" />
                    </div>
                )}
                <div class="flex flex-wrap text-sm leading-3 font-mono" ref={container}>
                    {path().map(node => {
                        const hoverProps = createHover(hovering =>
                            hovered.toggleHoveredNode(node.id, 'node', hovering),
                        )
                        return (
                            <>
                                <div class="w-3 h-4 mx-.5 center-child first:hidden">
                                    <Icon.CarretRight class="w-2 h-2 mb-[0.15rem] text-disabled" />
                                </div>
                                <div
                                    class={`${styles.highlight_container} h-3 p-y-.25 my-0.25
                                    flex items-center gap-x-1 cursor-pointer`}
                                    style={{
                                        [styles.highlight_opacity_var]: hovered.isNodeHovered(
                                            node.id,
                                        )
                                            ? '0.3'
                                            : '0',
                                    }}
                                    {...hoverProps}
                                    onClick={() => inspector.setInspectedOwner(node.id)}
                                >
                                    <div
                                        class={`${styles.highlight_element} b b-solid b-gray-400 rounded-sm`}
                                    />
                                    {node.type === NodeType.Component ||
                                    node.type === NodeType.Element ? (
                                        <div
                                            class={
                                                node.type === NodeType.Component
                                                    ? 'text-text'
                                                    : 'text-disabled'
                                            }
                                        >
                                            {node.name || UNKNOWN}
                                        </div>
                                    ) : (
                                        <Node_Type_Icon
                                            type={node.type}
                                            class="w-2.5 h-2.5 text-disabled"
                                        />
                                    )}
                                </div>
                            </>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
