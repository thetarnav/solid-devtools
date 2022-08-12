import { render } from "solid-js/web"
import { Component, For, Show } from "solid-js"
import { HighlightsProvider, OwnerNode, Splitter, Scrollable, Skeleton } from "@solid-devtools/ui"
import { graphs, highlights } from "./state/graph"
import { focused, details } from "./state/details"
import "./state/bridge"

import * as styles from "./styles.css"
import "@solid-devtools/ui/css"

const DetailsPanel: Component = () => {
  return (
    // ! Transition component is brokey
    // <Transition
    //   onEnter={fadeIn}
    //   onExit={fadeOut}
    //   mode="outin"
    // >
    <Show when={details()} fallback={<Skeleton />}>
      <div>Hello</div>
    </Show>
    // </Transition>
  )
}

const App: Component = () => {
  return (
    <HighlightsProvider value={highlights}>
      <div class={styles.app}>
        <header class={styles.header}>
          <h3>Welcome to Solid Devtools</h3>
          <p>Number of Roots: {Object.keys(graphs).length}</p>
        </header>
        <div class={styles.content}>
          <Splitter
            onToggle={() => highlights.handleFocus(null)}
            side={focused() && <DetailsPanel />}
          >
            <Scrollable>
              <For each={graphs}>{root => <OwnerNode owner={root.tree} />}</For>
            </Scrollable>
          </Splitter>
        </div>
      </div>
    </HighlightsProvider>
  )
}

render(() => <App />, document.getElementById("root")!)
