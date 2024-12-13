/*

The devtools script is run every time the devtools are opened.
And it creates a brand new panel every time.

It connects to the background script.

*/

import {error, log} from '@solid-devtools/shared/utils'
import {ConnectionName, createPortMessanger, once} from '../shared/bridge.ts'
import {icons} from '../shared/icons.ts'

log('Devtools_Script loaded.')

// Create a connection to the background page
const port = chrome.runtime.connect({name: ConnectionName.Devtools})

const {onPortMessage: fromBackground} = createPortMessanger(port)

// "Versions" mean that devtools client is on the page
once(fromBackground, 'Versions', () => {

    log('Debugger connected -> Creating Devtools_Panel...')

    chrome.devtools.panels.create(
        'Solid',
        // Firefox requires absolute path
        (import.meta.env.BROWSER === 'firefox' ? '/' : '') + icons.disabled[32],
        'index.html',
        () => {
            if (chrome.runtime.lastError) {
                error('Creating Devtools_Panel Failed', chrome.runtime.lastError)
            } else {
                log('Devtools_Panel created.')
            }
        },
    )
})
