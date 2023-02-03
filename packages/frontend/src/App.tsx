import { Icon, Splitter } from '@/ui'
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from 'solid-headless'
import { Component, JSX, Show } from 'solid-js'
import * as styles from './App.css'
import { useController } from './controller'
import StructureView from './modules/structure/Structure'
import { SidePanel } from './SidePanel'

// const MainViewTabs: Component = () => {
//   const { view } = useController()

//   return (
//     <button
//       style={{
//         margin: '0 10px',
//         padding: '5px 10px',
//         border: '1px solid #fff',
//         'border-radius': '5px',
//         cursor: 'pointer',
//       }}
//       onClick={() => {
//         view.set(
//           view.get() === DevtoolsMainView.Structure
//             ? DevtoolsMainView.Dgraph
//             : DevtoolsMainView.Structure,
//         )
//       }}
//     >
//       View: {view.get().toUpperCase()}
//     </button>
//   )
// }

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
      <header class={styles.header.header}>
        <div class={styles.header.identity}>
          <Icon.SolidWhite class={styles.header.logo} />
          <div>
            <h3>Solid Developer Tools</h3>
            {props.headerSubtitle && <p class={styles.header.subtitle}>{props.headerSubtitle}</p>}
          </div>
        </div>
        {/* <MainViewTabs /> */}
        <Options />
      </header>
      <div class={styles.content}>
        <Splitter.Root>
          <Splitter.Panel>
            <StructureView />
          </Splitter.Panel>
          {ctx.inspector.inspectedOwnerId() && (
            <Splitter.Panel>
              <SidePanel />
            </Splitter.Panel>
          )}
        </Splitter.Root>
      </div>
    </div>
  )
}

export default App
