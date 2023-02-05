import { createSignal, Match, Switch } from 'solid-js'
import { useController } from './controller'
import DgraphView from './modules/dependency/DgraphView'
import InspectorView from './modules/inspector/Inspector'
import * as styles from './side-panel.css'
import { Icon, ToggleTabs } from './ui'
import { OwnerName } from './ui/components/Owner'

export function createSidePanel() {
  const { inspector } = useController()
  const { state, openComponentLocation, setInspectedOwner } = inspector

  const tabsTitleMap = {
    inspector: 'Inspector',
    dgraph: 'Graph',
  } as const

  const [openPanel, setOpenPanel] = createSignal<keyof typeof tabsTitleMap>('inspector')

  function SidePanel() {
    return (
      <div class={styles.root}>
        <header class={styles.header}>
          <OwnerName name={state.name} type={state.type} isTitle />
          <div class={styles.actions.container}>
            {/* <button class={styles.actions.button}>
                  <Icon.Eye class={styles.actions.icon} />
                </button> */}
            {state.location && (
              <button class={styles.actions.button} onClick={openComponentLocation}>
                <Icon.Code class={styles.actions.icon} />
              </button>
            )}
            <button class={styles.actions.button} onClick={() => setInspectedOwner(null)}>
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
    )
  }

  return {
    SidePanel,
    isOpen: inspector.isSomeNodeInspected,
  }
}
