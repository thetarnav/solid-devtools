import { Component, Show } from "solid-js"
import { useFloating } from "solid-floating-ui"
import { offset } from "@floating-ui/dom"
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from "solid-headless"
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
  return (
    <Popover defaultOpen={false} class={styles.options}>
      {({ isOpen, setState }) => {
        let button!: HTMLButtonElement
        return (
          <>
            <PopoverButton
              ref={button}
              onKeyDown={(e: KeyboardEvent) => e.key === " " && setState(true)}
              class={styles.optionsButton}
            >
              <Icon.Options class={styles.optionsIcon} />
            </PopoverButton>

            <Show when={isOpen()}>
              {() => {
                let menu: HTMLDivElement | undefined
                const position = useFloating(
                  () => button,
                  () => menu,
                  {
                    strategy: "fixed",
                    placement: "left-start",
                    middleware: [offset(8)],
                  },
                )
                return (
                  <PopoverPanel
                    class={styles.optionsPanel}
                    ref={menu}
                    on:keydown={(e: KeyboardEvent) => e.key === "Escape" && e.stopPropagation()}
                    style={{
                      top: `${position.y ?? 0}px`,
                      left: `${position.x ?? 0}px`,
                    }}
                  >
                    <Menu class={styles.optionsMenu}>
                      <MenuItem
                        as="a"
                        href="https://github.com/thetarnav/solid-devtools/issues"
                        target="_blank"
                      >
                        Report bug
                      </MenuItem>
                    </Menu>
                  </PopoverPanel>
                )
              }}
            </Show>
          </>
        )
      }}
    </Popover>
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
