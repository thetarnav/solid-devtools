import { Icon, Splitter } from '@/ui'
import { Menu, MenuItem, Popover, PopoverButton, PopoverPanel } from 'solid-headless'
import { Component, JSX, Show } from 'solid-js'
import { createSidePanel } from './SidePanel'
import StructureView from './modules/structure/structure-tree'
import theme, { toggle_button } from './ui/theme/new-theme'
import { varsStyle } from './ui/theme/vars.css'

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
        <Popover defaultOpen={false} class="relative ml-auto">
            {({ isOpen, setState }) => (
                <>
                    <PopoverButton
                        onKeyDown={(e: KeyboardEvent) => e.key === ' ' && setState(true)}
                        class={`${toggle_button} rounded-md ml-auto w-7 h-7`}
                    >
                        <Icon.Options class="w-4.5 h-4.5" />
                    </PopoverButton>
                    <Show when={isOpen()}>
                        <PopoverPanel
                            class="absolute z-9999 w-max top-0 right-full mr-2 p-2 rounded-md bg-panel-2 b b-solid b-panel-3"
                            on:keydown={(e: KeyboardEvent) =>
                                e.key === 'Escape' && e.stopPropagation()
                            }
                        >
                            <Menu class="flex flex-col items-stretch gap-2">
                                <MenuItem
                                    as="a"
                                    href="https://github.com/thetarnav/solid-devtools/issues"
                                    target="_blank"
                                    class="text-text"
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

export const App: Component<{ headerSubtitle?: JSX.Element }> = props => {
    // side panel is created here to keep the state between renders
    const sidePanel = createSidePanel()

    return (
        <div
            class={`${varsStyle} h-full w-full overflow-hidden grid text-base font-sans bg-panel-bg text-text`}
            style={{
                'grid-template-rows': `${theme.spacing[10]} 1fr`,
            }}
        >
            <header class="p-2 flex items-center gap-x-2 bg-panel-bg b-b b-solid b-panel-border text-text">
                <div class="flex items-center gap-x-2">
                    <Icon.SolidWhite class="w-4 h-4 text-disabled" />
                    <div>
                        <h3>Solid Developer Tools</h3>
                        {props.headerSubtitle && (
                            <p class="text-disabled font-mono text-sm">{props.headerSubtitle}</p>
                        )}
                    </div>
                </div>
                {/* <MainViewTabs /> */}
                <Options />
            </header>
            <div class="overflow-hidden">
                <Splitter.Root>
                    <Splitter.Panel>
                        <StructureView />
                    </Splitter.Panel>
                    {sidePanel.isOpen() && (
                        <Splitter.Panel>
                            <sidePanel.SidePanel />
                        </Splitter.Panel>
                    )}
                </Splitter.Root>
            </div>
        </div>
    )
}
