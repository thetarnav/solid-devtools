import { Component, JSX, Show } from 'solid-js'
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from 'solid-headless'
import { Splitter, ToggleButton, Icon } from '@/ui'
import Inspector from './modules/inspector/Inspector'
import Structure from './modules/structure/Structure'
import { useController } from './controller'
import * as styles from './App.css'

const SelectComponent: Component<{}> = () => {
  const ctx = useController()
  return (
    <ToggleButton
      class={styles.select}
      onToggle={ctx.setLocatorState}
      selected={ctx.locatorEnabled()}
    >
      <Icon.Select class={styles.selectIcon} />
    </ToggleButton>
  )
}

const Options: Component<{}> = () => {
  return (
    <Popover defaultOpen={false} class={styles.options}>
      {({ isOpen, setState }) => (
        <>
          <PopoverButton
            onKeyDown={(e: KeyboardEvent) => e.key === ' ' && setState(true)}
            class={styles.optionsButton}
          >
            <Icon.Options class={styles.optionsIcon} />
          </PopoverButton>
          <Show when={isOpen()}>
            <PopoverPanel
              class={styles.optionsPanel}
              on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && e.stopPropagation()}
            >
              <Menu class={styles.optionsMenu}>
                <MenuItem
                  as="a"
                  href="https://github.com/thetarnav/solid-devtools/issues"
                  target="_blank"
                >
                  Report a bug
                </MenuItem>
              </Menu>
            </PopoverPanel>
          </Show>
        </>
      )}
    </Popover>
  )
}

const App: Component<{ headerSubtitle?: JSX.Element }> = props => {
  const ctx = useController()
  return (
    <div class={styles.app}>
      <header class={styles.header}>
        <SelectComponent />
        <div>
          <h3>Welcome to Solid Devtools</h3>
          {props.headerSubtitle && <p class={styles.subtitle}>{props.headerSubtitle}</p>}
        </div>
        <Options />
      </header>
      <div class={styles.content}>
        <Splitter onToggle={() => ctx.setInspectedNode(null)} side={<Inspector />}>
          <Structure />
        </Splitter>
      </div>
    </div>
  )
}

export default App
