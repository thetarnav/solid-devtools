import { createHighlightedOwnerName, Icon, ToggleTabs } from '@/ui'
import { Accessor, createContext, createEffect, createSignal, Match, Switch } from 'solid-js'
import { useController } from './controller'
import DgraphView from './modules/dependency/DgraphView'
import InspectorView from './modules/inspector/Inspector'
import * as styles from './side-panel.css'

export const SidePanelCtx = createContext<{
  openPanel: Accessor<'inspector' | 'dgraph'>
  setOpenPanel: (panel: 'inspector' | 'dgraph') => void
}>()

export function createSidePanel() {
  const ctx = useController()
  const { inspector } = ctx
  const { state, openComponentLocation, setInspectedOwner } = inspector

  const tabsTitleMap = {
    inspector: 'Inspector',
    dgraph: 'Graph',
  } as const

  const [openPanel, setOpenPanel] = createSignal<keyof typeof tabsTitleMap>('inspector')

  const { OwnerName, pingUpdated } = createHighlightedOwnerName()
  createEffect(() => {
    const id = inspector.inspected.ownerId
    id && ctx.listenToNodeUpdate(id, pingUpdated)
  })

  function SidePanel() {
    return (
      <SidePanelCtx.Provider value={{ openPanel, setOpenPanel }}>
        <div class={styles.root}>
          <header class={styles.header}>
            <OwnerName name={state.name} type={state.type} isTitle />
            <div class={styles.actions.container}>
              {/* <button class={styles.actions.button}>
                  <Icon.Eye class={styles.actions.icon} />
                </button> */}
              {state.location && (
                <button
                  title="Open component location"
                  class={styles.actions.button}
                  onClick={openComponentLocation}
                >
                  <Icon.Code class={styles.actions.icon} />
                </button>
              )}
              <button
                title="Close inspector"
                class={styles.actions.button}
                onClick={() => setInspectedOwner(null)}
              >
                <Icon.Close class={styles.actions.icon} />
              </button>
            </div>
            <ToggleTabs class={styles.tabs.list} active={openPanel()} onSelect={setOpenPanel}>
              {Option =>
                (['inspector', 'dgraph'] as const).map(panel => (
                  <Option for={panel}>{tabsTitleMap[panel]}</Option>
                ))
              }
            </ToggleTabs>
          </header>
          <Switch>
            <Match when={openPanel() === 'inspector'}>
              <InspectorView />
            </Match>
            <Match when={openPanel() === 'dgraph'}>
              <DgraphView />
            </Match>
          </Switch>
        </div>
      </SidePanelCtx.Provider>
    )
  }

  return {
    SidePanel,
    isOpen: inspector.isSomeNodeInspected,
  }
}
