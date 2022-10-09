import { Component, Show } from 'solid-js'
import { useFloating } from 'solid-floating-ui'
import { offset } from '@floating-ui/dom'
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from 'solid-headless'
import { Splitter, ToggleButton, Icon } from '@/ui'
import Inspector from './modules/inspector/Inspector'
import Structure from './modules/structure/Structure'
import { versions } from './versions'
import { useController } from './controller'
import * as styles from './App.css'

const SelectComponent: Component<{}> = props => {
  const ctx = useController()
  return (
    <ToggleButton
      class={styles.select}
      onToggle={ctx.setExtLocatorState}
      selected={ctx.locatorEnabled()}
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
              onKeyDown={(e: KeyboardEvent) => e.key === ' ' && setState(true)}
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
                    strategy: 'fixed',
                    placement: 'left-start',
                    middleware: [offset(8)],
                  },
                )
                return (
                  <PopoverPanel
                    class={styles.optionsPanel}
                    ref={menu}
                    on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && e.stopPropagation()}
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
                        Report a bug
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
  const ctx = useController()
  return (
    <div class={styles.app}>
      <header class={styles.header}>
        <SelectComponent />
        <div>
          <h3>Welcome to Solid Devtools</h3>
          <p>Version: {versions().extension}</p>
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
