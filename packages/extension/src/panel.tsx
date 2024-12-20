/*
    Devtools panel entry point
*/

import * as s        from 'solid-js'
import * as web      from 'solid-js/web'
import {log}         from '@solid-devtools/shared/utils'
import * as frontend from '@solid-devtools/frontend'
import * as bridge   from './bridge.ts'

import '@solid-devtools/frontend/dist/styles.css'

log(bridge.Place_Name.Panel+' loaded.')


function App() {

    const empty_versions: bridge.Versions = {
        solid:          '',
        client:         '',
        expectedClient: '',
        extension:      '',
    }
    const [versions, setVersions] = s.createSignal<bridge.Versions>(empty_versions)

    const devtools = frontend.createDevtools()
    
    const port = chrome.runtime.connect({name: bridge.ConnectionName.Panel})
    bridge.port_on_message(port, e => {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (e.name) {
        case 'Versions':
            setVersions(e.details ?? empty_versions)
            break
        default:
            /* Client -> Devtools */
            if (e.name in devtools.bridge.input) {
                devtools.bridge.input.emit(e.name as any, e.details)
            }
        }
    })

    /* Devtools -> Client */
    devtools.bridge.output.listen(e => bridge.port_post_message_obj(port, e))

    return (
        <div
            style={{
                position: 'fixed',
                height:   '100vh',
                width:    '100vw',
                inset:    '0',
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
            <frontend.MountIcons />
        </div>
    )
}

web.render(() => <App />, document.getElementById('root')!)
