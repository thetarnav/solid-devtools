import { Component, For, Show } from "solid-js"
import {
  StructureProvider,
  OwnerNode,
  Splitter,
  Scrollable,
  OwnerPath,
  ToggleButton,
} from "@solid-devtools/ui"
import * as Icon from "@solid-devtools/ui/icons"
import {
  graphs,
  toggleHoveredOwner,
  useComputationUpdatedSelector,
  useHoveredSelector,
} from "./state/graph"
import { focused, details, setSelectedNode, useOwnerSelectedSelector } from "./state/details"
import { setExtLocator, locatorEnabled } from "./state/selected"
import * as styles from "./styles.css"
import Details from "./components/Details"

const SelectComponent: Component<{}> = props => {
  return (
    <ToggleButton class={styles.select} onToggle={setExtLocator} selected={locatorEnabled()}>
      <Icon.Select class={styles.selectIcon} />
    </ToggleButton>
  )
}

const App: Component = () => {
  return (
    <StructureProvider
      value={{
        handleFocus: setSelectedNode,
        useUpdatedSelector: useComputationUpdatedSelector,
        useSelectedSelector: useOwnerSelectedSelector,
        toggleHoveredOwner: (owner, state) => toggleHoveredOwner(owner, state, true),
        useHoveredSelector,
      }}
    >
      <div class={styles.app}>
        <header class={styles.header}>
          <SelectComponent />
          <div>
            <h3>Welcome to Solid Devtools</h3>
            <p>Number of Roots: {graphs.length}</p>
          </div>
        </header>
        <div class={styles.content}>
          <Splitter
            onToggle={() => setSelectedNode(null)}
            side={
              <Show when={focused()}>
                <Details />
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
