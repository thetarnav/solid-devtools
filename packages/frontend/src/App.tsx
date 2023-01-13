import { Icon, Splitter } from '@/ui'
import { DevtoolsMainView } from '@solid-devtools/debugger/types'
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from 'solid-headless'
import { Component, JSX, Match, Show, Switch } from 'solid-js'
import * as styles from './App.css'
import { useController } from './controller'
import DgraphView from './modules/dependency'
import Inspector from './modules/inspector/Inspector'
import StructureView from './modules/structure/Structure'

const App: Component<{ headerSubtitle?: JSX.Element }> = props => {
  const ctx = useController()

  return (
    <div class={styles.app}>
      <header class={styles.header.header}>
        <div class={styles.header.identity}>
          <Icon.SolidWhite class={styles.header.logo} />
          <div>
            <h3>Solid Developer Tools</h3>
            {props.headerSubtitle && <p class={styles.header.subtitle}>{props.headerSubtitle}</p>}
          </div>
        </div>
        <MainViewTabs />
        <Options />
      </header>
      <div class={styles.content}>
        <Splitter onToggle={() => ctx.setInspectedNode(null)} side={<Inspector />}>
          <Switch>
            <Match when={ctx.openedView() == DevtoolsMainView.Structure}>
              <StructureView />
            </Match>
            <Match when={ctx.openedView() == DevtoolsMainView.Dgraph}>
              <DgraphView />
            </Match>
          </Switch>
        </Splitter>
      </div>
    </div>
  )
}

const MainViewTabs: Component = () => {
  const ctx = useController()

  return (
    <button
      style={{
        margin: '0 10px',
        padding: '5px 10px',
        border: '1px solid #fff',
        'border-radius': '5px',
        cursor: 'pointer',
      }}
      onClick={() => {
        ctx.setOpenedView(p =>
          p === DevtoolsMainView.Structure ? DevtoolsMainView.Dgraph : DevtoolsMainView.Structure,
        )
      }}
    >
      View: {ctx.openedView().toUpperCase()}
    </button>
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

export default App
