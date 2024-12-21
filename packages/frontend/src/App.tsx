import * as s from 'solid-js'
import * as theme from '@solid-devtools/shared/theme'
import * as ui from './ui/index.ts'
import {createSidePanel} from './SidePanel.tsx'
import {StructureView} from './structure.tsx'


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

const Options: s.Component = () => {

    let details!: HTMLDetailsElement

    return (
        <details
            ref={details}
            class="relative ml-auto"
            on:focusout={e => {
                // Close if focus moves outside the details element
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    details.removeAttribute('open')
                }
            }}
            on:keydown={e => {
                switch (e.key) {
                case 'Escape':
                    details.removeAttribute('open')
                    break
                case 'ArrowDown':
                case 'ArrowUp': {
                    e.preventDefault()
                    let root = details.getRootNode()
                    if (root instanceof Document || root instanceof ShadowRoot) {
                        let items = [...details.querySelectorAll('[role="menuitem"]')]
                        let focused_idx = items.indexOf(root.activeElement!)
                        let dir = e.key === 'ArrowDown' ? 1 : -1
                        let next_idx = (focused_idx + dir + items.length) % items.length
                        let el = items[next_idx]
                        if (el instanceof HTMLElement) el.focus()
                    }
                    break
                }
                }
            }}>
            <summary
                class={`${ui.toggle_button} rounded-md ml-auto w-7 h-7`}>
                <ui.Icon.Options
                    class="w-4.5 h-4.5"
                />
            </summary>
            <div
                class='absolute z-9999 w-max top-0 right-full mr-2 p-1 rounded-md bg-panel-2 b b-solid b-panel-3'>
                <div
                    role='menu'
                    class='flex flex-col items-stretch gap-0.5'>
                    <a
                        role='menuitem'
                        tabindex='0'
                        href='https://github.com/thetarnav/solid-devtools/issues'
                        target='_blank'
                        class='
                            flex items-center gap-1 p-1 rounded-md outline-none
                            text-text transition-colors hover:bg-orange-500/10 focus:bg-orange-500/10'>
                        <ui.Icon.Bug class='w-3 h-3 mb-px text-orange-500 dark:text-orange-400' />
                        Report a bug
                    </a>
                    <a
                        role='menuitem'
                        tabindex='0'
                        href='https://github.com/sponsors/thetarnav'
                        target='_blank'
                        class='
                            flex items-center gap-1 p-1 rounded-md outline-none
                            text-text transition-colors hover:bg-pink-500/10 focus:bg-pink-500/10'>
                        <ui.Icon.Heart class='w-3 h-3 mb-px text-pink-500 dark:text-pink-400' />
                        Support the project
                    </a>
                </div>
            </div>
        </details>
    )
}


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