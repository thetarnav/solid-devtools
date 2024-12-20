/*

Constent Script

This script is injected into every page and is responsible for:

- Forwarding messages between the background script and the debugger
- Injecting the real-world script to detect if solid is on the page (and the debugger if so)

*/

import {error, log} from '@solid-devtools/shared/utils'
import * as bridge from './bridge.ts'

// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import detector_path from './detector.ts?script&module'
// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import debugger_path from './debugger.ts?script&module'


if (import.meta.env.DEV) log(bridge.Place_Name.Content+' loaded.')


function loadScriptInRealWorld(path: string): Promise<void> {
    return new Promise((resolve, reject) => {

        const script = document.createElement('script')
        script.src  = chrome.runtime.getURL(path)
        script.type = 'module'

        script.addEventListener('error', err => reject(err))
        script.addEventListener('load', () => resolve())

        /* The script should execute as soon as possible */
        const mount = (document.head as HTMLHeadElement | null) || document.documentElement
        mount.appendChild(script)
    })
}


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
    Load Detect_Real_World script
    ↳ Debugger_Setup detected
        ↳ Load Debugger_Real_World
            ↳ 'Debugger_Connected' message
    */

    loadScriptInRealWorld(detector_path)
        .catch(err => error(`Detector_Real_World (${detector_path}) failed to load.`, err))
}


const extension_version = chrome.runtime.getManifest().version

const port = chrome.runtime.connect({name: bridge.ConnectionName.Content})

let devtools_opened = false

// prevent the script to be added multiple times if detected before solid
let debugger_real_world_added = false

/* From Background */
bridge.port_on_message(port, e => {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (e.name) {
    case 'DevtoolsOpened':
        devtools_opened = e.details
        bridge.window_post_message_obj(e)
        break
    default:
        /* Background -> Client */
        bridge.window_post_message_obj(e)
    }
})

/* From Client / Detector_Real_World */
bridge.window_on_message(e => {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (e.name) {
    // From Detector_Real_World
    case 'Detected': {

        /* Forward to Background script */
        bridge.port_post_message_obj(port, e)

        /* Load Debugger_Real_World */
        if (e.details && e.details.Debugger && !debugger_real_world_added) {
            debugger_real_world_added = true

            loadScriptInRealWorld(debugger_path)
                .catch(err => error(`Debugger_Real_World (${debugger_path}) failed to load.`, err))
        }

        break
    }
    case 'Debugger_Connected': {

        // eslint-disable-next-line no-console
        console.log(
            '🚧 %csolid-devtools%c is in early development! 🚧\nPlease report any bugs to https://github.com/thetarnav/solid-devtools/issues',
            'color: #fff; background: rgba(181, 111, 22, 0.7); padding: 1px 4px;',
            'color: #e38b1b',
        )

        bridge.port_post_message(port, 'Versions', {
            client:         e.details.client,
            solid:          e.details.solid,
            extension:      extension_version,
            expectedClient: import.meta.env.EXPECTED_CLIENT,
        })

        if (devtools_opened) {
            bridge.window_post_message('DevtoolsOpened', devtools_opened)
        }

        break
    }
    default:
        /* Client -> Background */
        bridge.port_post_message_obj(port, e)
    }
})

