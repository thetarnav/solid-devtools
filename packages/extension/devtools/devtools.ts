/*

The devtools script is run every time the devtools are opened.
And it creates a brand new panel every time.

It connects to the background script.

*/

import {error, log} from '@solid-devtools/shared/utils'
import {ConnectionName, createPortMessanger, once} from '../shared/bridge.ts'
import {icons} from '../shared/icons.ts'

log('Devtools-Script working.')

// Create a connection to the background page
const port = chrome.runtime.connect({name: ConnectionName.Devtools})

const {onPortMessage: fromBackground} = createPortMessanger(port)

let panel: chrome.devtools.panels.ExtensionPanel | undefined

// "Versions" mean that devtools client is on the page
once(fromBackground, 'Versions', async () => {
    if (panel) return log('Panel already exists.')

    log('Solid on page – creating panel...')
    try {
        panel = await createPanel()
        log('Panel created.')
    } catch (err) {
        error(err)
    }
})

const createPanel = () =>
    new Promise<chrome.devtools.panels.ExtensionPanel>((resolve, reject) => {
        const onCreate = (newPanel: chrome.devtools.panels.ExtensionPanel) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
            else resolve(newPanel)
        }

        if (import.meta.env.BROWSER === 'firefox') {
            chrome.devtools.panels.create(
                'Solid',
                /* firefox requires absolute paths */
                '/' + icons.disabled[32],
                '/index.html',
                onCreate,
            )
        } else {
            chrome.devtools.panels.create('Solid', icons.disabled[32], 'index.html', onCreate)
        }
    })
