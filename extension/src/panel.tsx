/*
    Devtools panel entry point
*/

import * as s        from 'solid-js'
import * as web      from 'solid-js/web'
import {error, log, warn} from '@solid-devtools/shared/utils'
import * as frontend from '@solid-devtools/frontend'
import * as debug    from '@solid-devtools/debugger/types'

import {
    ConnectionName, Place_Name, port_on_message, port_post_message_obj,
    type Message, type Versions,
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
    const [versions, setVersions] = s.createSignal(empty_versions)
    const [port, setPort] = s.createSignal<chrome.runtime.Port | null>(null)
    let message_queue: Message[] = []

    const devtools = frontend.createDevtools({
        headerSubtitle() {
            let {extension, client, client_expected} = versions()
            return `#${extension}_${client}/${client_expected}${port() == null ? ' [DISCONNECTED]' : ''}`
        },
        errorOverlayFooter() {
            return <>
                <ul>
                    <li>Solid: {versions().solid}</li>
                    <li>Extension: {versions().extension}</li>
                    <li>Client: {versions().client}</li>
                    <li>Expected client: {versions().client_expected}</li>
                    <li>Connection: {port() != null ? 'Connected' : 'Disconnected (attempting to reconnect...)'}</li>
                </ul>
            </>
        },
        useShortcuts:      true,
        catchWindowErrors: true,
    })

    let connecting = false
    function connect_port() {
        if (connecting) return

        connecting = true
        log('Attempting to connect port...')

        try {
            let new_port = chrome.runtime.connect({name: ConnectionName.Panel})
            setPort(new_port)
            log('Port connected successfully')

            // Flush queued messages
            for (let m of message_queue.splice(0, message_queue.length)) {
                port_post_message_obj(new_port, m)
            }

            port_on_message(new_port, e => {
                // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
                switch (e.kind) {
                case 'Versions':
                    setVersions(e.data ?? empty_versions)
                    break
                default:
                    /* Client -> Devtools */
                    devtools.input.emit(
                        // @ts-expect-error - type mismatch between debug types and actual message
                        e,
                    )
                }
            })

            new_port.onDisconnect.addListener(() => {
                if (port() === new_port) {
                    setPort(null)
                    setTimeout(connect_port, 100)
                }
            })
        } catch (_err) {
            error('Failed to reconnect port:', _err)
        }

        connecting = false
    }

    connect_port()

    devtools.output.listen(e => {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (e.kind) {
        case 'ConsoleInspectValue': {
            /*
             `chrome.devtools.inspectedWindow.eval` runs in a devtools console
             so the value can be additionally inspected with `inspect()`
            */
            let get_value = `window[${JSON.stringify(debug.GLOBAL_GET_VALUE)}]`
            let value_id = JSON.stringify(e.data)

            chrome.devtools.inspectedWindow.eval(
                /*js*/`typeof ${get_value} === 'function' && (() => {
                    let v = ${get_value}(${value_id})
                    inspect(v)
                    console.log(v)
                })()`,
                (_, err?: chrome.devtools.inspectedWindow.EvaluationExceptionInfo) => {
                if (err && (err.isError || err.isException)) {
                    error(err.description)
                }
            })
            break
        }
        default:
            /* Devtools -> Client */
            let curr_port = port()
            if (curr_port == null) {
                warn('Port not available, message queued')
                message_queue.push(e)
                connect_port()
                return
            }

            try {
                port_post_message_obj(curr_port, e)
            } catch (err) {
                warn('Message failed to send:', err)
                message_queue.push(e)
                connect_port()
            }
            break
        }
    })

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
