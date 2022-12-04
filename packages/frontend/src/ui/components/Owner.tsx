import { Component, JSX } from 'solid-js'
import { NodeType } from '@solid-devtools/debugger'
import { Icon, IconComponent } from '..'
import * as styles from './Owner.css'

export const NodeTypeIcon: Component<{ type: NodeType; class?: string }> = props => {
  let prevIcon: IconComponent | undefined
  let prevRendered: JSX.Element | undefined
  return () => {
    const IconComp = (() => {
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
      }
    })()
    if (IconComp === prevIcon) return prevRendered
    return (prevRendered = (prevIcon = IconComp) ? <IconComp class={props.class} /> : null)
  }
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
            return <span class={styles.type}>Root</span>
          case NodeType.Context:
            return <span class={styles.type}>Context</span>
          case NodeType.Render:
            return <span class={styles.type}>Render Effect</span>
          case NodeType.Component:
            return <span class={styles.componentName}>{props.name}</span>
          case NodeType.Element:
            return <span class={styles.elementName}>{props.name}</span>
          default:
            return <span class={styles.name}>{props.name}</span>
        }
      }}
    </span>
  )
}
