import { render } from "solid-js/web"
import { Component, For, Show } from "solid-js"
import { destructure } from "@solid-primitives/destructure"
import { NodeType, OwnerDetails } from "@solid-devtools/shared/graph"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import { HighlightsProvider, OwnerNode, Splitter, Scrollable, Skeleton } from "@solid-devtools/ui"
import { graphs, highlights } from "./state/graph"
import { focused, details } from "./state/details"
import "./state/bridge"

import * as styles from "./styles.css"
import "@solid-devtools/ui/css"

const DetailsPanel: Component<{ details: OwnerDetails }> = props => {
  const { name, id, type, path } = destructure(() => props.details)

  return (
    <div class={styles.details.root}>
      <div class={styles.details.pathWrapper}>
        <For each={path()}>
          {owner => (
            <div class={styles.details.pathItem}>
              {owner === NOTFOUND ? "_NOT_FOUND_" : owner.name}
            </div>
          )}
        </For>
      </div>
      <header class={styles.details.header}>
        <h1 class={styles.details.h1}>
          {name()} <span class={styles.details.id}>#{id()}</span>
        </h1>
        <div class={styles.details.type}>{NodeType[type()]}</div>
      </header>
    </div>
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
            side={
              focused() && (
                <Show when={details()} fallback={<Skeleton />}>
                  <DetailsPanel details={details()!} />
                </Show>
              )
            }
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
