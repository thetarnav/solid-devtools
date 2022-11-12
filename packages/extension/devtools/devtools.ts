/*

The devtools script is run every time the devtools are opened.
And it creates a brand new panel every time.

It connects to the background script.

*/

import { createPortMessanger, DEVTOOLS_CONNECTION_NAME } from '../shared/messanger'
import { once } from 'solid-devtools/bridge'
import { error, log } from '@solid-devtools/shared/utils'

log('Devtools script working.')

// Create a connection to the background page
const port = chrome.runtime.connect({ name: DEVTOOLS_CONNECTION_NAME })

const { onPortMessage: fromBackground } = createPortMessanger(port)

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
    chrome.devtools.panels.create(
      'Solid',
      'assets/icons/solid-normal-32.png',
      'index.html',
      newPanel => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(newPanel)
      },
    )
  })

export {}
