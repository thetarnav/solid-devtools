import { Component } from "solid-js"
import { Graph } from "@solid-devtools/shared/graph"
import * as styles from "./Path.css"

export const OwnerPath: Component<{ path: Graph.Path }> = props => {
  return <div class={styles.container}></div>
}
