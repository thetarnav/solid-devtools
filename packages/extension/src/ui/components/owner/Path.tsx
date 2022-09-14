import { Component } from "solid-js"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import { Icon } from "@/ui"
import { Inspector } from "@/state"
import * as styles from "./Path.css"

export const OwnerPath: Component<{ path: Inspector.Path }> = props => {
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
            {node === NOTFOUND ? <span class={styles.notFound}></span> : node.name}
          </div>
        </>
      ))}
    </div>
  )
}
