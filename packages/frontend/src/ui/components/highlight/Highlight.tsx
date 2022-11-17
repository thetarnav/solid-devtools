import { ParentComponent } from 'solid-js'
import { clsx } from 'clsx'
import * as styles from './Highlight.css'

export const Highlight: ParentComponent<{
  isSignal?: boolean
  highlight?: boolean
  class?: string
}> = props => {
  return (
    <div class={clsx(styles.container, props.highlight && styles.highlighted, props.class)}>
      <div class={styles.highlight} data-signal={props.isSignal}></div>
      {props.children}
    </div>
  )
}
