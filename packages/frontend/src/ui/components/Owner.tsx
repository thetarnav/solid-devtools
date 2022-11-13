import { Component } from 'solid-js'
import { NodeType } from '@solid-devtools/debugger'
import { Icon } from '..'
import * as styles from './Owner.css'

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

export const OwnerName: Component<{
  name: string | undefined
  type: NodeType
  isTitle?: boolean
  isFrozen?: boolean
}> = props => {
  return (
    <span
      class={styles.container}
      classList={{ [styles.title]: props.isTitle }}
      data-frozen={props.isFrozen}
    >
      <NodeTypeIcon type={props.type} class={styles.typeIcon} />
      {() => {
        switch (props.type) {
          case NodeType.Root:
          case NodeType.Context:
            return <span class={styles.type}>{NodeType[props.type]}</span>
          case NodeType.Render:
            return <span class={styles.type}>Render Effect</span>
          case NodeType.Component:
            return <span class={styles.name}>{`<${props.name}>`}</span>
          default:
            return <span class={styles.name}>{props.name}</span>
        }
      }}
    </span>
  )
}
