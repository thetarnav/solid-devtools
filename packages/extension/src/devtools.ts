/*

The devtools script is run every time the devtools are opened.
And it creates a brand new panel every time.

It connects to the background script.

*/

import {error, log} from '@solid-devtools/shared/utils'
import * as bridge from './bridge.ts'
import * as icons from './icons.ts'

log(bridge.Place_Name.Devtools_Script+' loaded.')

// Create a connection to the background page
const port = chrome.runtime.connect({name: bridge.ConnectionName.Devtools})

const bg_messanger = bridge.createPortMessanger(
    bridge.Place_Name.Devtools_Script,
    bridge.Place_Name.Background,
    port)

// Firefox requires absolute path
const PATH_PREFIX = import.meta.env.BROWSER === 'firefox' ? '/' : ''

// "Versions" mean that devtools client is on the page
bridge.once(bg_messanger.on, 'Versions', () => {

    log('Debugger connected -> Creating Devtools_Panel...')

    chrome.devtools.panels.create(
        'Solid',
        PATH_PREFIX + icons.OUTLINE_32,
        PATH_PREFIX + 'src/panel.html',
        () => {
            if (chrome.runtime.lastError) {
                error('Creating Devtools_Panel Failed', chrome.runtime.lastError)
            } else {
                log('Devtools_Panel created.')
            }
        },
    )
})
