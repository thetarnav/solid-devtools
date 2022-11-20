import { Component } from 'solid-js'
import { createElementSize } from '@solid-primitives/resize-observer'
import { useRemSize } from '@solid-primitives/styles'
import { NodeType } from '@solid-devtools/debugger/types'
import { createHover } from '@solid-devtools/shared/primitives'
import { Icon } from '@/ui'
import { useController } from '@/controller'
import * as styles from './path.css'
import { NodeTypeIcon } from '@/ui/components/Owner'
import { unwrap } from 'solid-js/store'

export const OwnerPath: Component = () => {
  const { structure, toggleHoveredNode, setInspectedNode, inspectedDetails } = useController()

  const rem = useRemSize()
  const containerSize = createElementSize(() => container)
  const expandable = () => (containerSize.height ?? 0) > rem() * styles.MIN_PATH_HEIGHT_IN_REM

  let container!: HTMLDivElement
  return (
    <div class={styles.path}>
      <div class={styles.content} data-extendable={expandable()}>
        {expandable() && (
          <div class={styles.expendable}>
            <Icon.Options class={styles.expendableIcon} />
          </div>
        )}
        <div class={styles.container} ref={container}>
          {inspectedDetails()?.path.map(nodeProxy => {
            const node = unwrap(nodeProxy)
            const hoverProps = createHover(hovering => toggleHoveredNode(node.id, hovering))
            return (
              <>
                <div class={styles.divider}>
                  <Icon.CarretRight class={styles.carret} />
                </div>
                <div
                  class={styles.item}
                  data-hovered={structure.isHovered(node)}
                  {...hoverProps}
                  onClick={() => setInspectedNode(node)}
                >
                  <div class={styles.highlight} />
                  {node.type === NodeType.Component ? (
                    <>
                      <NodeTypeIcon type={NodeType.Component} class={styles.typeIcon} />
                      <div class={styles.name}>{node.name}</div>
                    </>
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
