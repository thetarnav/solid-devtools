/*
    Devtools panel entry point
*/

import {createSignal} from 'solid-js'
import {render} from 'solid-js/web'
import {type Debugger} from '@solid-devtools/debugger/types'
import {log} from '@solid-devtools/shared/utils'
import {createDevtools, MountIcons} from '@solid-devtools/frontend'
import * as bridge from './bridge.ts'

import '@solid-devtools/frontend/dist/styles.css'

log(bridge.Place_Name.Panel+' loaded.')

const port = chrome.runtime.connect({name: bridge.ConnectionName.Panel})
const bg_messanger = bridge.createPortMessanger
    <Debugger.OutputChannels, Debugger.InputChannels>(
        bridge.Place_Name.Panel,
        bridge.Place_Name.Background,
        port)

function App() {
    const empty_versions: bridge.Versions = {
        solid:          '',
        client:         '',
        expectedClient: '',
        extension:      '',
    }

    const [versions, setVersions] = createSignal<bridge.Versions>(empty_versions)

    bridge.once(bg_messanger.on, 'Versions', e => {
        if (e) {
            setVersions(e)
        } else {
            setVersions(empty_versions)
        }
    })

    const devtools = createDevtools()

    devtools.bridge.output.listen(e => bg_messanger.forward({
        name:       e.name,
        details:    e.details,
        forwarding: true,
    }))

    bg_messanger.on(e => {
        // some events are internal and should not be forwarded to the devtools
        if (!(e.name in devtools.bridge.input)) return
        devtools.bridge.input.emit(e.name as any, e.details)
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
            <devtools.Devtools
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
