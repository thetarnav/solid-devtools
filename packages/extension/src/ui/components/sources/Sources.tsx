import { Component, Show } from "solid-js"
import { Repeat } from "@solid-primitives/range"
import * as styles from "./sources.css"

export const Sources: Component<{ length: number }> = props => {
  const a = () => Math.ceil(props.length / 2)
  const b = () => Math.floor(props.length / 2)

  const Row: Component<{ length: number }> = props => (
    <div class={styles.sources.row}>
      <Repeat times={props.length}>
        <div class={styles.sources.dot}></div>
      </Repeat>
    </div>
  )

  return (
    <Show when={props.length}>
      <div class={styles.sources.container}>
        <Row length={a()} />
        <Show when={b()}>
          <Row length={b()} />
        </Show>
      </div>
    </Show>
  )
}
