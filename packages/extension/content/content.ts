/*

Constent Script

This script is injected into every page and is responsible for:

- Forwarding messages between the background script and the debugger
- Injecting the real-world script to detect if solid is on the page (and the debugger if so)

*/

import {error, log} from '@solid-devtools/shared/utils'
import * as bridge from '../shared/bridge.ts'

// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import detectorPath from './detector?script&module'
// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import debuggerPath from './debugger?script&module'

if (import.meta.env.DEV) log(bridge.Place_Name.Content_Script+' loaded.')

const extension_version = chrome.runtime.getManifest().version

const port = chrome.runtime.connect({name: bridge.ConnectionName.Content})

let devtools_opened = false

const fromClient = bridge.makeMessageListener(bridge.Place_Name.Content_Script)
const toClient   = bridge.makePostMessage()

const {postPortMessage: toBackground, onPortMessage: fromBackground} =
    bridge.createPortMessanger(
        bridge.Place_Name.Content_Script,
        bridge.Place_Name.Background,
        port)

function loadScriptInRealWorld(path: string): Promise<void> {
    return new Promise((resolve, reject) => {

        const script = document.createElement('script')
        script.src  = chrome.runtime.getURL(path)
        script.type = 'module'

        script.addEventListener('error', err => reject(err))
        script.addEventListener('load', () => resolve())

        /* The script should execute as soon as possible */
        const head = (document.head as HTMLHeadElement | null) || document.documentElement
        if (head.firstChild) {
            head.insertBefore(script, head.firstChild)
        } else {
            head.appendChild(script)
        }
    })
}


/*
 Load Detect_Real_World script
   ↳ Debugger_Setup detected
       ↳ Load Debugger_Real_World
           ↳ 'Debugger_Connected' message
*/

loadScriptInRealWorld(detectorPath)
    .catch(err => error(`Detector_Real_World (${detectorPath}) failed to load.`, err))

// prevent the script to be added multiple times if detected before solid
let debugger_real_world_added = false

/* from Detector_Real_World */
window.addEventListener('message', e => {
    if (!e.data || typeof e.data !== 'object' || e.data.name !== bridge.DETECT_MESSAGE) return

    const state = e.data.state as bridge.DetectionState

    toBackground('Detected', state)

    /* Load Debugger_Real_World */
    if (state.Debugger && !debugger_real_world_added) {
        debugger_real_world_added = true

        loadScriptInRealWorld(debuggerPath)
            .catch(err => error(`Debugger_Real_World (${debuggerPath}) failed to load.`, err))
    }
})

fromClient('Debugger_Connected', versions => {
    
    // eslint-disable-next-line no-console
    console.log(
        '🚧 %csolid-devtools%c is in early development! 🚧\nPlease report any bugs to https://github.com/thetarnav/solid-devtools/issues',
        'color: #fff; background: rgba(181, 111, 22, 0.7); padding: 1px 4px;',
        'color: #e38b1b',
    )

    toBackground('Versions', {
        client:         versions.client,
        solid:          versions.solid,
        extension:      extension_version,
        expectedClient: import.meta.env.EXPECTED_CLIENT,
    })

    fromClient('ResetPanel', () => toBackground('ResetPanel'))

    if (devtools_opened) toClient('DevtoolsOpened')
})

// After page reload, the content script is reloaded but the background script is not.
// This means that 'DevtoolsOpened' message will come after the Client is setup.
// We need to send it after it connects.
fromBackground('DevtoolsOpened', () => {
    devtools_opened = true
    toClient('DevtoolsOpened')
})
fromBackground('DevtoolsClosed', () => toClient('DevtoolsClosed'))

fromClient(e => {
    // forward all client messages to the background script in
    const payload: bridge.ForwardPayload = {forwarding: true, name: e.name, details: e.details}
    port.postMessage(payload)
})

port.onMessage.addListener(data => {
    // forward all devtools messages (from background) to the client
    if (bridge.isForwardMessage(data)) bridge.forwardMessageToWindow(data)
})
