import { Component, For, Show } from "solid-js"
import { destructure } from "@solid-primitives/destructure"
import { NodeType, Graph } from "@solid-devtools/shared/graph"
import {
  StructureProvider,
  SignalContextProvider,
  OwnerNode,
  Splitter,
  Scrollable,
  Signals,
  OwnerPath,
} from "@solid-devtools/ui"
import {
  graphs,
  toggleHoveredOwner,
  useComputationUpdatedSelector,
  useHoveredSelector,
} from "./state/graph"
import {
  focused,
  details,
  useUpdatedSignalsSelector,
  toggleSignalFocus,
  setFocused,
  useOwnerSelectedSelector,
} from "./state/details"
import * as styles from "./styles.css"

const DetailsContent: Component<{ details: Graph.OwnerDetails }> = props => {
  const { name, id, type, signals } = destructure(() => props.details)

  return (
    <div class={styles.details.root}>
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
          }}
        >
          <Signals each={Object.values(signals())} />
        </SignalContextProvider>
      </div>
    </div>
  )
}

const App: Component = () => {
  return (
    <StructureProvider
      value={{
        handleFocus: setFocused,
        useUpdatedSelector: useComputationUpdatedSelector,
        useSelectedSelector: useOwnerSelectedSelector,
        toggleHoveredOwner,
        useHoveredSelector,
      }}
    >
      <div class={styles.app}>
        <header class={styles.header}>
          <h3>Welcome to Solid Devtools</h3>
          <p>Number of Roots: {Object.keys(graphs).length}</p>
        </header>
        <div class={styles.content}>
          <Splitter
            onToggle={() => setFocused(null)}
            side={
              <Show when={focused()}>
                <div>
                  <Show when={details()}>{details => <DetailsContent details={details} />}</Show>
                </div>
              </Show>
            }
          >
            <div class={styles.graphWrapper}>
              <Scrollable>
                <For each={graphs}>{root => <OwnerNode owner={root.tree} level={0} />}</For>
              </Scrollable>
              <div class={styles.path}>
                <div class={styles.pathInner}>
                  <Show when={details()?.path}>
                    <OwnerPath path={details()?.path!} />
                  </Show>
                </div>
              </div>
            </div>
          </Splitter>
        </div>
      </div>
    </StructureProvider>
  )
}

export default App
