import { Component } from 'solid-js'
import { NodeType } from '@solid-devtools/debugger/types'
import { createHover } from '@solid-devtools/shared/primitives'
import { Icon } from '@/ui'
import { useController } from '@/controller'
import * as styles from './path.css'
import { NodeTypeIcon } from '@/ui/components/Owner'

export const OwnerPath: Component = () => {
  const { isNodeHovered, toggleHoveredNode, setInspectedNode, inspectedDetails } = useController()

  const path = () => inspectedDetails()?.path ?? []

  return (
    <div class={styles.container}>
      {path().map((node, index) => {
        const hoverProps = createHover(hovering => toggleHoveredNode(node.id, hovering))
        return (
          <>
            {index > 0 && (
              <div class={styles.divider}>
                <Icon.CarretRight class={styles.carret} />
              </div>
            )}
            <div
              class={styles.item}
              data-hovered={isNodeHovered(node.id)}
              {...hoverProps}
              onClick={() => setInspectedNode(node)}
            >
              <div class={styles.highlight} />
              {() => {
                switch (node.type) {
                  case NodeType.Root:
                  case NodeType.Render:
                    return <NodeTypeIcon type={node.type} class={styles.typeIcon} />
                  default:
                    return (
                      <>
                        <NodeTypeIcon type={node.type} class={styles.typeIcon} />
                        <div class={styles.name}>{node.name}</div>
                      </>
                    )
                }
              }}
            </div>
          </>
        )
      })}
    </div>
  )
}
