import { Component, Show } from "solid-js"
import { Splitter, ToggleButton, Icon } from "@/ui"
import { structure } from "./state/structure/structure-old"
import { focused, setSelectedNode } from "./state/inspector"
import { setExtLocator, locatorEnabled } from "./state/selected"
import * as styles from "./styles.css"
import Details from "./components/Details"
import StructureView from "./components/Structure"

const SelectComponent: Component<{}> = props => {
  return (
    <ToggleButton class={styles.select} onToggle={setExtLocator} selected={locatorEnabled()}>
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
          <p>Number of Roots: {structure.length}</p>
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
          <StructureView />
        </Splitter>
      </div>
    </div>
  )
}

export default App
