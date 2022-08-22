import { Component, For, Show } from "solid-js"
import { destructure } from "@solid-primitives/destructure"
import { NodeType, Graph } from "@solid-devtools/shared/graph"
import { NOTFOUND } from "@solid-devtools/shared/variables"
import {
  HighlightsProvider,
  SignalContextProvider,
  OwnerNode,
  Splitter,
  Scrollable,
  Signals,
} from "@solid-devtools/ui"
import { highlights, graphs } from "./state/graph"
import {
  focused,
  details,
  useUpdatedSignalsSelector,
  toggleSignalFocus,
  useFocusedSignalSelector,
} from "./state/details"
import * as styles from "./styles.css"

const DetailsContent: Component<{ details: Graph.OwnerDetails }> = props => {
  const { name, id, type, path, signals } = destructure(() => props.details)

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
      <div>
        <SignalContextProvider
          value={{
            useUpdatedSelector: useUpdatedSignalsSelector,
            toggleSignalFocus: toggleSignalFocus,
            useFocusedSelector: useFocusedSignalSelector,
          }}
        >
          <Signals each={Object.values(signals())} />
        </SignalContextProvider>
      </div>
    </div>
  )
}

const DetailsPanel: Component<{}> = props => {
  return (
    <Show when={focused()}>
      <div class={styles.details.transitionWrapper}>
        {/* <Transition name="fade"> */}
        <Show when={details()}>{details => <DetailsContent details={details} />}</Show>
        {/* </Transition> */}
      </div>
    </Show>
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
          <Splitter onToggle={() => highlights.handleFocus(null)} side={<DetailsPanel />}>
            <Scrollable>
              <For each={graphs}>{root => <OwnerNode owner={root.tree} />}</For>
            </Scrollable>
          </Splitter>
        </div>
      </div>
    </HighlightsProvider>
  )
}

export default App
