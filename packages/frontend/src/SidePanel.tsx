import { createHighlightedOwnerName, Icon, theme, ToggleTabs } from '@/ui'
import clsx from 'clsx'
import { Accessor, createContext, createEffect, createSignal, Match, Switch } from 'solid-js'
import { useController } from './controller'
import * as dgraph from './modules/dependency'
import { InspectorView } from './modules/inspector/Inspector'

export const panel_header_el_border =
    'content-empty absolute z-1 inset-x-0 top-full h-0.6px bg-panel-border'

export const SidePanelCtx = createContext<{
    openPanel: Accessor<'inspector' | 'dgraph'>
    setOpenPanel: (panel: 'inspector' | 'dgraph') => void
}>()

// TODO these should probably be abstracted to a reusable component

export const hover_background = `bg-gray-5 dark:bg-gray-4
    bg-opacity-0 dark:bg-opacity-0
    hover:bg-opacity-10 selected:hover:bg-opacity-10
    active:bg-opacity-05 active:hover:bg-opacity-05 selected:bg-opacity-05
    transition-colors`

export const hover_text = `text-gray-5 dark:text-gray-4
    text-opacity-85 dark:text-opacity-85
    hover:text-opacity-100 selected:text-opacity-100`

export const action_button = clsx(hover_background, hover_text, 'w-6 h-6 rounded center-child')

export const action_icon = 'w-4 h-4'

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
                <div
                    class="h-full grid"
                    style={{
                        'grid-template-rows': `${theme.spacing.header_height} 1fr`,
                        'grid-template-columns': '100%',
                    }}
                >
                    <header class="relative p-l-4 flex items-center">
                        <div class={panel_header_el_border} />
                        <OwnerName name={state.name} type={state.type} is_title />
                        <div class="p-x-1 ml-auto flex items-center gap-x-1">
                            {/* <button class={styles.actions.button}>
                                <Icon.Eye class={styles.actions.icon} />
                            </button> */}
                            {state.location && (
                                <button
                                    title="Open component location"
                                    class={action_button}
                                    onClick={openComponentLocation}
                                >
                                    <Icon.Code class={action_icon} />
                                </button>
                            )}
                            <button
                                title="Close inspector"
                                class={action_button}
                                onClick={() => setInspectedOwner(null)}
                            >
                                <Icon.Close class={action_icon} />
                            </button>
                        </div>
                        <ToggleTabs
                            class="b-l b-solid b-panel-2 h-full"
                            active={openPanel()}
                            onSelect={setOpenPanel}
                        >
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
                            <dgraph.Dgraph_View />
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
