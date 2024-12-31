/*
    Devtools panel entry point
*/

import * as s        from 'solid-js'
import * as web      from 'solid-js/web'
import {log}         from '@solid-devtools/shared/utils'
import * as frontend from '@solid-devtools/frontend'

import {
    ConnectionName, Place_Name, port_on_message, port_post_message_obj,
    type Versions,
} from './shared.ts'

import '@solid-devtools/frontend/dist/styles.css'

log(Place_Name.Panel+' loaded.')


function App() {

    const empty_versions: Versions = {
        solid:           '',
        client:          '',
        client_expected: '',
        extension:       '',
    }
    const [versions, setVersions] = s.createSignal<Versions>(empty_versions)

    const devtools = frontend.createDevtools({
        headerSubtitle() {
            let {extension, client, client_expected} = versions()
            return `#${extension}_${client}/${client_expected}`
        },
        errorOverlayFooter() {
            return <>
                <ul>
                    <li>Solid: {versions().solid}</li>
                    <li>Extension: {versions().extension}</li>
                    <li>Client: {versions().client}</li>
                    <li>Expected client: {versions().client_expected}</li>
                </ul>
            </>
        },
        useShortcuts:      true,
        catchWindowErrors: true,
    })

    const port = chrome.runtime.connect({name: ConnectionName.Panel})
    port_on_message(port, e => {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (e.name) {
        case 'Versions':
            setVersions(e.details ?? empty_versions)
            break
        default:
            /* Client -> Devtools */
            devtools.input.emit(
                // @ts-expect-error
                e
            )
        }
    })

    /* Devtools -> Client */
    devtools.output.listen(e => port_post_message_obj(port, e))

    return (
        <div
            style={{
                position: 'fixed',
                height:   '100vh',
                width:    '100vw',
                inset:    '0',
            }}
        >
            <devtools.Devtools />
            <frontend.MountIcons />
        </div>
    )
}

web.render(() => <App />, document.getElementById('root')!)
