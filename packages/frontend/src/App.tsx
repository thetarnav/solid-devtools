import { Component, createSignal, JSX, Show } from 'solid-js'
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from 'solid-headless'
import { createShortcut } from '@solid-primitives/keyboard'
import { Splitter, ToggleButton, Icon, MountIcons } from '@/ui'
import Inspector from './modules/inspector/Inspector'
import Structure from './modules/structure/Structure'
import { useController } from './controller'
import * as styles from './App.css'

const LocatorButton: Component = () => {
  const ctx = useController()
  return (
    <ToggleButton
      class={styles.locatorButton}
      onToggle={ctx.setLocatorState}
      selected={ctx.locatorEnabled()}
    >
      <Icon.Select class={styles.locatorIcon} />
    </ToggleButton>
  )
}

const Search: Component = () => {
  const ctx = useController()

  const [value, setValue] = createSignal('')

  const handleChange = (v: string) => {
    setValue(v)
    ctx.searchStructure('')
  }

  return (
    <form
      class={styles.search.form}
      onSubmit={e => {
        e.preventDefault()
        ctx.searchStructure(value())
      }}
      onReset={() => handleChange('')}
    >
      <input
        ref={input => {
          if (ctx.options.useShortcuts) {
            createShortcut(['/'], () => input.focus())
            createShortcut(['Escape'], () => {
              if (document.activeElement === input) input.blur()
              if (input.value) handleChange((input.value = ''))
            })
          }
        }}
        class={styles.search.input}
        type="text"
        placeholder="Search"
        onInput={e => handleChange(e.currentTarget.value)}
        onPaste={e => handleChange(e.currentTarget.value)}
      />
      <div class={styles.search.iconContainer}>
        <Icon.Search class={styles.search.icon} />
      </div>
      {value() && (
        <button class={styles.search.clearButton} type="reset">
          <Icon.Close class={styles.search.clearIcon} />
        </button>
      )}
    </form>
  )
}

const Options: Component = () => {
  return (
    <Popover defaultOpen={false} class={styles.options.container}>
      {({ isOpen, setState }) => (
        <>
          <PopoverButton
            onKeyDown={(e: KeyboardEvent) => e.key === ' ' && setState(true)}
            class={styles.options.button}
          >
            <Icon.Options class={styles.options.icon} />
          </PopoverButton>
          <Show when={isOpen()}>
            <PopoverPanel
              class={styles.options.panel}
              on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && e.stopPropagation()}
            >
              <Menu class={styles.options.menu}>
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
        <LocatorButton />
        <Search />
        <div>
          <h3>Solid Devtools</h3>
          {props.headerSubtitle && <p class={styles.subtitle}>{props.headerSubtitle}</p>}
        </div>
        <Options />
      </header>
      <div class={styles.content}>
        <Splitter onToggle={() => ctx.setInspectedNode(null)} side={<Inspector />}>
          <Structure />
        </Splitter>
      </div>
      <MountIcons />
    </div>
  )
}

export default App
