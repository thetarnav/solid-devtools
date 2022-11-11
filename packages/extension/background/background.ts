import { createCallbackStack, log } from '@solid-devtools/shared/utils'
import { OnMessageFn, PostMessageFn } from 'solid-devtools/bridge'
import {
  createPortMessanger,
  createRuntimeMessanger,
  DEVTOOLS_CONNECTION_NAME,
  DEVTOOLS_CONTENT_PORT,
} from '../shared/messanger'

log('background script working')

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let currentPort: chrome.runtime.Port | undefined

// state reused between panels
let panelVisibility = false
let solidOnPage = false
let versions:
  | {
      client: string
      expectedClient: string
      extension: string
    }
  | undefined

let postPortMessage: PostMessageFn
let onPortMessage: OnMessageFn

chrome.runtime.onConnect.addListener(port => {
  // handle the connection to the devtools page (devtools.html)
  if (port.name === DEVTOOLS_CONNECTION_NAME) {
    const disconnectListener = () => {
      panelVisibility = false
      postPortMessage('PanelClosed', true)
      log('Devtools Port disconnected')
      port.onDisconnect.removeListener(disconnectListener)
    }
    port.onDisconnect.addListener(disconnectListener)
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

  onPortMessage('SolidOnPage', () => {
    solidOnPage = true
    postRuntimeMessage('SolidOnPage', '')
    // respond with page visibility to the debugger, to let him know
    // if the panel is already created and visible (after page refresh)
    postPortMessage('PanelVisibility', panelVisibility)
  })

  onPortMessage('Versions', v => (versions = v))

  // make sure the devtools script will be triggered to create devtools panel
  addCleanup(
    onRuntimeMessage('DevtoolsScriptConnected', tabId => {
      postPortMessage('DevtoolsScriptConnected', tabId)
      if (solidOnPage) postRuntimeMessage('SolidOnPage', '')
    }),
  )

  onRuntimeMessage('DevtoolsPanelConnected', () => {
    log('DevtoolsPanelConnected')

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
      onRuntimeMessage('PanelVisibility', visibility => {
        postPortMessage('PanelVisibility', (panelVisibility = visibility))
      }),
    )

    addCleanup(
      onRuntimeMessage('ToggleInspectedValue', e => postPortMessage('ToggleInspectedValue', e)),
    )
    addCleanup(onRuntimeMessage('SetInspectedNode', e => postPortMessage('SetInspectedNode', e)))

    addCleanup(onRuntimeMessage('HighlightElement', e => postPortMessage('HighlightElement', e)))

    addCleanup(onRuntimeMessage('ForceUpdate', () => postPortMessage('ForceUpdate')))
  })
})

export {}
