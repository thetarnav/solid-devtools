import { useController } from '@/controller'
import { Icon } from '@/ui'
import { NodeTypeIcon } from '@/ui/components/Owner'
import { NodeType } from '@solid-devtools/debugger/types'
import { createHover } from '@solid-devtools/shared/primitives'
import { createElementSize } from '@solid-primitives/resize-observer'
import { useRemSize } from '@solid-primitives/styles'
import { Component, createMemo } from 'solid-js'
import { useStructure } from './Structure'
import * as styles from './path.css'

export const OwnerPath: Component = () => {
  const { inspector, hovered } = useController()
  const structure = useStructure()

  let container!: HTMLDivElement
  const rem = useRemSize()
  const containerSize = createElementSize(() => container)
  const expandable = () => (containerSize.height ?? 0) > rem() * styles.MIN_PATH_HEIGHT_IN_REM

  const path = createMemo(() => {
    const node = structure.inspectedNode()
    return node ? structure.getNodePath(node) : []
  })

  return (
    <div class={styles.path}>
      <div class={styles.content} data-extendable={expandable()}>
        {expandable() && (
          <div class={styles.expendable}>
            <Icon.Options class={styles.expendableIcon} />
          </div>
        )}
        <div class={styles.container} ref={container}>
          {path().map(node => {
            const hoverProps = createHover(hovering =>
              hovered.toggleHoveredNode(node.id, 'node', hovering),
            )
            return (
              <>
                <div class={styles.divider}>
                  <Icon.CarretRight class={styles.carret} />
                </div>
                <div
                  class={styles.item}
                  data-hovered={hovered.isNodeHovered(node.id)}
                  {...hoverProps}
                  onClick={() => inspector.setInspectedOwner(node.id)}
                >
                  <div class={styles.highlight} />
                  {node.type === NodeType.Component || node.type === NodeType.Element ? (
                    <div class={styles.name[node.type === NodeType.Component ? 'default' : 'gray']}>
                      {node.name}
                    </div>
                  ) : (
                    <NodeTypeIcon type={node.type} class={styles.typeIcon} />
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
