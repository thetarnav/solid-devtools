/*

The devtools script is run every time the devtools are opened.
And it creates a brand new panel every time.

It connects to the background script.

*/

import {error, log} from '@solid-devtools/shared/utils'

import {
    Place_Name, ConnectionName, port_on_message, ICON_OUTLINE_32
} from './shared.ts'


log(Place_Name.Devtools+' loaded.')


// Create a connection to the background page
const port = chrome.runtime.connect({name: ConnectionName.Devtools})

// Firefox requires absolute path
const PATH_PREFIX = import.meta.env.BROWSER === 'firefox' ? '/' : ''

type Panel = chrome.devtools.panels.ExtensionPanel

let panel_creating = false
let panel: Panel | undefined

port_on_message(port, e => {

    // "Versions" mean that devtools client is on the page
    if (e.kind === 'Versions' && e.data && !panel_creating && !panel) {
        panel_creating = true

        log('Debugger connected -> Creating Devtools_Panel...')

        chrome.devtools.panels.create(
            'Solid',
            PATH_PREFIX + ICON_OUTLINE_32,
            PATH_PREFIX + 'src/panel.html',
            _panel => {
                panel_creating = false
                panel = _panel

                if (chrome.runtime.lastError) {
                    error('Creating Devtools_Panel Failed', chrome.runtime.lastError)
                } else {
                    log('Devtools_Panel created.')
                }
            },
        )
    }
})
