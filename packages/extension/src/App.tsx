import { Component, createSignal, Show } from "solid-js"
import { useFloating } from "solid-floating-ui"
import { offset } from "@floating-ui/dom"
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

const Options: Component<{}> = props => {
  const [isOpen, setOpen] = createSignal(false)
  const [button, setButton] = createSignal<HTMLButtonElement>()

  return (
    <>
      <ToggleButton ref={setButton} class={styles.options} onToggle={setOpen} selected={isOpen()}>
        <Icon.Options class={styles.optionsIcon} />
      </ToggleButton>
      <Show when={isOpen()}>
        {() => {
          let menu!: HTMLDivElement
          const position = useFloating(button, () => menu, {
            strategy: "fixed",
            placement: "left-start",
            middleware: [offset(8)],
          })
          return (
            <div
              class={styles.optionsMenu}
              ref={menu}
              style={{
                top: `${position.y ?? 0}px`,
                left: `${position.x ?? 0}px`,
              }}
            >
              Hello there! I'm a menu!
            </div>
          )
        }}
      </Show>
    </>
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
        <Options />
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
