import { ParentComponent } from 'solid-js'
import * as styles from './badge.css'

export const Badge: ParentComponent = props => {
  return <div class={styles.badge}>{props.children}</div>
}
