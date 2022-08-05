import { Component, For } from "solid-js"
import { graphs, highlights } from "./graph"
import { HighlightsProvider, OwnerNode } from "@solid-devtools/ui"
import { styles } from "./styles.css"

const App: Component = () => {
  return (
    <HighlightsProvider value={highlights}>
      <header class={styles.header}>
        <h3>Welcome to Solid Devtools</h3>
        <p>Number of Roots: {Object.keys(graphs).length}</p>
      </header>
      <div>
        <For each={graphs}>{root => <OwnerNode owner={root.tree} />}</For>
      </div>
    </HighlightsProvider>
  )
}

export default App
