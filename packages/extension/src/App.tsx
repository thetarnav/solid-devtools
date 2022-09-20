import { Component, Show } from "solid-js"
import { Splitter, ToggleButton, Icon } from "@/ui"
import { inspector, structure, locator } from "@/state"
import * as styles from "./styles.css"
import Details from "./components/Inspector"
import StructureView from "./components/structure/Structure"

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
          <p>Number of Roots: {structure.structure().length}</p>
        </div>
      </header>
      <div class={styles.content}>
        <Splitter
          onToggle={() => inspector.setInspectedNode(null)}
          side={
            <Show when={inspector.state.node}>
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
