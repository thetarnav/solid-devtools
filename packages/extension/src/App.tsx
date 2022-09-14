import { Component, Show } from "solid-js"
import { Splitter, ToggleButton, Icon } from "@/ui"
import { inspector, structure, locator } from "@/state"
import * as styles from "./styles.css"
import Details from "./components/Details"
import StructureView from "./components/Structure"

const SelectComponent: Component<{}> = props => {
  return (
    <ToggleButton
      class={styles.select}
      onToggle={locator.setExtLocator}
      selected={locator.locatorEnabled()}
    >
      <Icon.Select class={styles.selectIcon} />
    </ToggleButton>
  )
}

const App: Component = () => {
  return (
    <div class={styles.app}>
      <header class={styles.header}>
        <SelectComponent />
        <div>
          <h3>Welcome to Solid Devtools</h3>
          <p>Number of Roots: {structure.roots().length}</p>
        </div>
      </header>
      <div class={styles.content}>
        <Splitter
          onToggle={() => inspector.setSelectedNode(null)}
          side={
            <Show when={inspector.focused()}>
              <Details />
            </Show>
          }
        >
          <StructureView />
        </Splitter>
      </div>
    </div>
  )
}

export default App
