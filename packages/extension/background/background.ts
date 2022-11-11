/*

Background script runs only once, when the extension is installed.

*/

import { createCallbackStack, log } from '@solid-devtools/shared/utils'
import type { OnMessageFn, PostMessageFn, Versions } from 'solid-devtools/bridge'
import {
  createPortMessanger,
  createRuntimeMessanger,
  DEVTOOLS_CONNECTION_NAME,
  DEVTOOLS_CONTENT_PORT,
  POPUP_CONNECTION_NAME,
} from '../shared/messanger'

log('Background script working')

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let currentPort: chrome.runtime.Port | undefined
let versions: Versions | undefined
let SolidOnPage = false

let postPortMessage: PostMessageFn
let onPortMessage: OnMessageFn

chrome.runtime.onConnect.addListener(port => {
  // handle the connection to the devtools page (devtools.html)
  if (port.name === DEVTOOLS_CONNECTION_NAME) {
    if (versions) postRuntimeMessage('Versions', versions)

    const disconnectListener = () => {
      postPortMessage('DevtoolsClosed')
      log('Devtools Port disconnected')
      port.onDisconnect.removeListener(disconnectListener)
    }
    port.onDisconnect.addListener(disconnectListener)
    return
  }

  // handle the connection to the popup
  if (port.name === POPUP_CONNECTION_NAME) {
    if (versions) postRuntimeMessage('Versions', versions)
    else if (SolidOnPage) postRuntimeMessage('SolidOnPage')
    return
  }

  // handle the connection to the content script (content.js)
  if (port.name !== DEVTOOLS_CONTENT_PORT) return log('Ignored connection:', port.name)

  if (currentPort) {
    log(`Switching Content Ports: ${currentPort.sender?.documentId} -> ${port.sender?.documentId}`)
  }

  currentPort = port
  // lastDocumentId = port.sender?.documentId

  const { push: addCleanup, execute: clearRuntimeListeners } = createCallbackStack()

  port.onDisconnect.addListener(() => {
    clearRuntimeListeners()
    log('Content Port disconnected.')
  })

  const messanger = createPortMessanger(port)
  postPortMessage = messanger.postPortMessage
  onPortMessage = messanger.onPortMessage

  // "Versions" from content-script, serves also as a "SolidOnPage" message
  onPortMessage('Versions', v => {
    versions = v
    postRuntimeMessage('Versions', v)
  })

  // "SolidOnPage" from realWorld script
  onPortMessage('SolidOnPage', () => {
    SolidOnPage = true
    postRuntimeMessage('SolidOnPage')
  })

  onRuntimeMessage('DevtoolsOpened', () => {
    // notify the content script that the devtools panel is ready
    postPortMessage('DevtoolsOpened')

    postRuntimeMessage('Versions', versions!)

    onPortMessage('ResetPanel', () => postRuntimeMessage('ResetPanel'))

    onPortMessage('StructureUpdate', e => postRuntimeMessage('StructureUpdate', e))

    onPortMessage('ComputationUpdates', e => postRuntimeMessage('ComputationUpdates', e))
    onPortMessage('SetInspectedDetails', e => postRuntimeMessage('SetInspectedDetails', e))
    onPortMessage('InspectorUpdate', e => postRuntimeMessage('InspectorUpdate', e))
    onPortMessage('ClientHoveredComponent', e => postRuntimeMessage('ClientHoveredComponent', e))
    onPortMessage('ClientInspectedNode', e => postRuntimeMessage('ClientInspectedNode', e))

    onPortMessage('ClientLocatorMode', e => postRuntimeMessage('ClientLocatorMode', e))
    addCleanup(onRuntimeMessage('ExtLocatorMode', e => postPortMessage('ExtLocatorMode', e)))

    addCleanup(
      onRuntimeMessage('ToggleInspectedValue', e => postPortMessage('ToggleInspectedValue', e)),
    )
    addCleanup(onRuntimeMessage('SetInspectedNode', e => postPortMessage('SetInspectedNode', e)))

    addCleanup(onRuntimeMessage('HighlightElement', e => postPortMessage('HighlightElement', e)))

    addCleanup(onRuntimeMessage('ForceUpdate', () => postPortMessage('ForceUpdate')))
  })
})

export {}
