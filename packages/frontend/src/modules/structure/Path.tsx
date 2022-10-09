import { Component } from 'solid-js'
import { NodeType } from '@solid-devtools/shared/graph'
import { createHover } from '@solid-devtools/shared/primitives'
import { Icon } from '@/ui'
import { NodeTypeIcon } from './OwnerNode'
import type { Structure } from '.'
import { useController } from '@/controller'
import * as styles from './path.css'

export const OwnerPath: Component<{ path: Structure.Node[] }> = props => {
  const { isNodeHovered, toggleHoveredNode, setInspectedNode } = useController()

  return (
    <div class={styles.container}>
      {props.path.map((node, index) => (
        <>
          {index > 0 && (
            <div class={styles.divider}>
              <Icon.CarretRight class={styles.carret} />
            </div>
          )}
          <div
            class={styles.item}
            data-hovered={isNodeHovered(node.id)}
            {...createHover(hovering => toggleHoveredNode(node.id, hovering))}
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
      ))}
    </div>
  )
}
