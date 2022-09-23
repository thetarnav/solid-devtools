import { Component } from "solid-js"
import { Icon } from "@/ui"
import { Structure } from "@/state"
import * as styles from "./path.css"

export const OwnerPath: Component<{ path: Structure.Node[] }> = props => {
  return (
    <div class={styles.container}>
      {props.path.map((node, index) => (
        <>
          {index > 0 && (
            <div class={styles.divider}>
              <Icon.CarretRight class={styles.carret} />
            </div>
          )}
          <div class={styles.item}>
            <div class={styles.highlight} />
            {node.name}
          </div>
        </>
      ))}
    </div>
  )
}
