import * as s from 'solid-js'
import * as theme from '@solid-devtools/shared/theme'
import * as ui from './ui/index.ts'
import {createSidePanel} from './SidePanel.tsx'
import {StructureView} from './structure.tsx'
// TODO: replace solid-headless
// @ts-expect-error
import {Menu, MenuItem, Popover, PopoverButton, PopoverPanel} from 'solid-headless'

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

const Options: s.Component = () => {
    return (
        <Popover defaultOpen={false} class="relative ml-auto">
            {(popover: any) => (
                <>
                    <PopoverButton
                        onKeyDown={(e: KeyboardEvent) => e.key === ' ' && popover.setState(true)}
                        class={`${ui.toggle_button} rounded-md ml-auto w-7 h-7`}
                    >
                        <ui.Icon.Options class="w-4.5 h-4.5" />
                    </PopoverButton>
                    <s.Show when={popover.isOpen()}>
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
                    </s.Show>
                </>
            )}
        </Popover>
    )
}

export const App: s.Component<{headerSubtitle?: s.JSX.Element}> = props => {
    // side panel is created here to keep the state between renders
    const sidePanel = createSidePanel()

    return (
        <div
            class="h-full w-full overflow-hidden grid text-base font-sans bg-panel-bg text-text"
            style={{'grid-template-rows': `${theme.spacing[10]} 1fr`}}
        >
            <header class="p-2 flex items-center gap-x-2 bg-panel-bg b-b b-solid b-panel-border text-text">
                <div class="flex items-center gap-x-2">
                    <ui.Icon.SolidWhite class="w-4 h-4 text-disabled" />
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
                <ui.SplitterRoot>
                    <ui.SplitterPanel>
                        <StructureView />
                    </ui.SplitterPanel>
                    {sidePanel.isOpen() && (
                        <ui.SplitterPanel>
                            <sidePanel.SidePanel />
                        </ui.SplitterPanel>
                    )}
                </ui.SplitterRoot>
            </div>
        </div>
    )
}
