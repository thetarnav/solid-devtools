import { onCleanup, ParentComponent } from "solid-js"
import * as styles from "./Scrollable.css"

export const Scrollable: ParentComponent<{}> = props => {
  return (
    <div class={styles.container}>
      <div class={styles.content}>{props.children}</div>
    </div>
  )
}
