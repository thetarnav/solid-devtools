/*
    Devtools panel entry point
*/

import {Debugger} from '@solid-devtools/debugger/types'
import {createDevtools, MountIcons} from '@solid-devtools/frontend'
import {createSignal} from 'solid-js'
import {render} from 'solid-js/web'
import {ConnectionName, createPortMessanger, once, Versions} from '../shared/bridge'

import '@solid-devtools/frontend/dist/styles.css'

const port = chrome.runtime.connect({name: ConnectionName.Panel})
const {postPortMessage: toBackground, onPortMessage: fromBackground} = createPortMessanger<
    Debugger.OutputChannels,
    Debugger.InputChannels
>(port)

function App() {
    const [versions, setVersions] = createSignal<Versions>({
        solid: '',
        client: '',
        expectedClient: '',
        extension: '',
    })

    once(fromBackground, 'Versions', setVersions)

    const {bridge, Devtools} = createDevtools()

    bridge.output.listen(e => toBackground(e.name, e.details))

    fromBackground(e => {
        // some events are internal and should not be forwarded to the devtools
        if (!(e.name in bridge.input)) return
        bridge.input.emit(e.name as any, e.details)
    })

    return (
        <div
            style={{
                position: 'fixed',
                height: '100vh',
                width: '100vw',
                inset: '0',
            }}
        >
            <Devtools
                headerSubtitle={`#${versions().extension}_${versions().client}/${
                    versions().expectedClient
                }`}
                errorOverlayFooter={
                    <ul>
                        <li>Solid: {versions().solid}</li>
                        <li>Extension: {versions().extension}</li>
                        <li>Client: {versions().client}</li>
                        <li>Expected client: {versions().expectedClient}</li>
                    </ul>
                }
                useShortcuts
                catchWindowErrors
            />
            <MountIcons />
        </div>
    )
}

render(() => <App />, document.getElementById('root')!)
