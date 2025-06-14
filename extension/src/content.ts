/*

Constent Script

This script is injected into every page and is responsible for:

- Forwarding messages between the background script and the debugger
- Injecting the real-world script to detect if solid is on the page (and the debugger if so)

*/

import {
    Place_Name, ConnectionName,
    port_on_message, port_post_message_obj, message,
    window_post_message_obj, window_on_message, window_post_message,
    place_error, place_log,
    type Message,
} from './shared.ts'

// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import real_world_path from './real_world.ts?script&module'


DEV: {place_log(Place_Name.Content, 'loaded.')}


/* Wait for the document to fully load before injecting any scripts */
if (document.readyState === 'complete') {
    on_loaded()
} else {
    document.addEventListener('DOMContentLoaded', () => {
        on_loaded()
    })
}

function on_loaded() {

    /*
    Load Real_World script
    ↳ Debugger_Setup detected
        ↳ Load Debugger
            ↳ 'Debugger_Connected' message
    */

    let script = document.createElement('script')
    script.src  = chrome.runtime.getURL(real_world_path)
    script.type = 'module'

    script.addEventListener('error', err => {
        place_error(Place_Name.Content, `real-world script (${real_world_path}) failed to load.`, err)
    })
    script.addEventListener('load', () => {
        DEV: {place_log(Place_Name.Content, `real-world script (${real_world_path}) loaded successfully.`)}
    })

    /* The script should execute as soon as possible */
    let mount = (document.head as HTMLHeadElement | null) || document.documentElement
    mount.appendChild(script)
}


let extension_version = chrome.runtime.getManifest().version

let bg_port: chrome.runtime.Port | null = null
let devtools_opened = false
let message_queue: Message[] = []

let connecting = false
function connect_port() {
    if (connecting) return

    connecting = true
    DEV: {place_log(Place_Name.Content, 'Attempting to connect port...')}

    try {
        let new_port = chrome.runtime.connect({name: ConnectionName.Content})
        bg_port = new_port
        DEV: {place_log(Place_Name.Content, 'Port connected successfully')}

        // Flush queued messages
        for (let m of message_queue.splice(0, message_queue.length)) {
            port_post_message_obj(new_port, m)
        }

        /* From Background */
        port_on_message(new_port, e => {
            // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
            switch (e.kind) {
            case 'DevtoolsOpened':
                devtools_opened = e.data
                window_post_message_obj(e)
                break
            default:
                /* Background -> Client */
                window_post_message_obj(e)
            }
        })

        new_port.onDisconnect.addListener(() => {
            if (bg_port === new_port) {
                bg_port = null
                setTimeout(connect_port, 100)
            }
        })
    } catch (err) {
        place_error(Place_Name.Content, 'Failed to connect port:', err)
    }

    connecting = false
}

connect_port()

/* From Client / Detector_Real_World */
window_on_message(e => {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (e.kind) {
    case 'Debugger_Connected': {

        // eslint-disable-next-line no-console
        console.log(
            '🚧 %csolid-devtools%c is in early development! 🚧\nPlease report any bugs to https://github.com/thetarnav/solid-devtools/issues',
            'color: #fff; background: rgba(181, 111, 22, 0.7); padding: 1px 4px;',
            'color: #e38b1b',
        )

        let versions_message = message('Versions', {
            client:          e.data.client,
            solid:           e.data.solid,
            extension:       extension_version,
            client_expected: import.meta.env.EXPECTED_CLIENT,
        })

        if (bg_port) {
            port_post_message_obj(bg_port, versions_message)
        } else {
            message_queue.push(versions_message)
            connect_port()
        }

        if (devtools_opened) {
            window_post_message('DevtoolsOpened', devtools_opened)
        }

        break
    }
    default:
        /* Client -> Background */
        if (bg_port) {
            port_post_message_obj(bg_port, e)
        } else {
            message_queue.push(e)
            connect_port()
        }
    }
})
