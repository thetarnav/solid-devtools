import * as styles from './App.css'
import { NodeType } from '@solid-devtools/shared/graph'
import { createHover } from '@solid-devtools/shared/primitives'
import { createSignal } from 'solid-js'

export const App = () => {
  const [hovered, setHovered] = createSignal(false)

  return (
    <h1
      class={styles.header}
      {...createHover(setHovered)}
      style={{ background: hovered() ? 'gray' : undefined }}
    >
      Hello, I'm a frontend. {NodeType[0]}
    </h1>
  )
}
