/*

The devtools script is run every time the devtools are opened.
And it creates a brand new panel every time.

It connects to the background script.

*/

import {
    Place_Name, Connection_Name, port_on_message, ICON_OUTLINE_32,
    place_error, place_log,
} from './shared.ts'


place_log(Place_Name.Devtools, 'loaded.')


// Create a connection to the background page
const port = chrome.runtime.connect({name: Connection_Name.Devtools})

// Firefox requires absolute path
const PATH_PREFIX = import.meta.env.BROWSER === 'firefox' ? '/' : ''

type Panel = chrome.devtools.panels.ExtensionPanel

let panel_creating = false
let panel: Panel | undefined

port_on_message(port, e => {

    // "Versions" mean that devtools client is on the page
    if (e.kind === 'Versions' && e.data && !panel_creating && !panel) {
        panel_creating = true

        place_log(Place_Name.Devtools, 'Debugger connected -> Creating Devtools_Panel...')

        chrome.devtools.panels.create(
            'Solid',
            PATH_PREFIX + ICON_OUTLINE_32,
            PATH_PREFIX + 'src/panel.html',
            _panel => {
                panel_creating = false
                panel = _panel

                if (chrome.runtime.lastError) {
                    place_error(Place_Name.Devtools, 'Creating Devtools_Panel Failed', chrome.runtime.lastError)
                } else {
                    place_log(Place_Name.Devtools, 'Devtools_Panel created.')
                }
            },
        )
    }
})
