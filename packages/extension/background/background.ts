import { createCallbackStack } from "@solid-primitives/utils"
import { log } from "@solid-devtools/shared/utils"
import { OnMessageFn, PostMessageFn } from "@solid-devtools/shared/bridge"
import {
  createPortMessanger,
  createRuntimeMessanger,
  DEVTOOLS_CONNECTION_NAME,
  DEVTOOLS_CONTENT_PORT,
} from "../shared/messanger"

log("background script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let currentPort: chrome.runtime.Port | undefined
let lastDocumentId: string | undefined

// state reused between panels
let panelVisibility = false
let solidOnPage = false
let postPortMessage: PostMessageFn
let onPortMessage: OnMessageFn

chrome.runtime.onConnect.addListener(port => {
  // handle the connection to the devtools page (devtools.html)
  if (port.name === DEVTOOLS_CONNECTION_NAME) {
    const disconnectListener = () => {
      panelVisibility = false
      postPortMessage("PanelVisibility", false)
      port.onDisconnect.removeListener(disconnectListener)
    }
    port.onDisconnect.addListener(disconnectListener)
    return
  }

  // handle the connection to the content script (content.js)
  if (port.name !== DEVTOOLS_CONTENT_PORT) return log("Ignored connection:", port.name)

  if (currentPort) {
    log(`Switching BG Ports: ${currentPort.sender?.documentId} -> ${port.sender?.documentId}`)
    postRuntimeMessage("ResetPanel")
  }

  currentPort = port
  lastDocumentId = port.sender?.documentId

  const { push: addCleanup, execute: clearListeners } = createCallbackStack()

  port.onDisconnect.addListener(() => {
    clearListeners()
    log("Port disconnected.")
  })

  const messanger = createPortMessanger(port)
  postPortMessage = messanger.postPortMessage
  onPortMessage = messanger.onPortMessage

  addCleanup(
    onPortMessage("SolidOnPage", () => {
      solidOnPage = true
      postRuntimeMessage("SolidOnPage")
      // respond with page visibility to the debugger, to let him know
      // if the panel is already created and visible (after page refresh)
      postPortMessage("PanelVisibility", panelVisibility)
    }),
  )

  addCleanup(onPortMessage("GraphUpdate", graph => postRuntimeMessage("GraphUpdate", graph)))

  addCleanup(
    onPortMessage("ComputationUpdates", payload =>
      postRuntimeMessage("ComputationUpdates", payload),
    ),
  )

  addCleanup(
    onPortMessage("SignalUpdates", payload => postRuntimeMessage("SignalUpdates", payload)),
  )

  addCleanup(
    onPortMessage("OwnerDetailsUpdate", payload =>
      postRuntimeMessage("OwnerDetailsUpdate", payload),
    ),
  )

  addCleanup(onPortMessage("SignalValue", payload => postRuntimeMessage("SignalValue", payload)))

  addCleanup(
    onPortMessage("SetHoveredOwner", payload => postRuntimeMessage("SetHoveredOwner", payload)),
  )

  addCleanup(
    onPortMessage("SendSelectedOwner", payload => postRuntimeMessage("SendSelectedOwner", payload)),
  )

  addCleanup(
    onRuntimeMessage("PanelVisibility", visibility => {
      panelVisibility = visibility
      postPortMessage("PanelVisibility", visibility)
    }),
  )

  // make sure the devtools script will be triggered to create devtools panel
  addCleanup(
    onRuntimeMessage("DevtoolsScriptConnected", tabId => {
      if (solidOnPage) postRuntimeMessage("SolidOnPage")
    }),
  )

  addCleanup(
    onRuntimeMessage("SetSelectedOwner", payload => postPortMessage("SetSelectedOwner", payload)),
  )
  addCleanup(
    onRuntimeMessage("SetSelectedSignal", payload => postPortMessage("SetSelectedSignal", payload)),
  )

  addCleanup(
    onRuntimeMessage("HighlightElement", payload => postPortMessage("HighlightElement", payload)),
  )

  addCleanup(onRuntimeMessage("ForceUpdate", () => postPortMessage("ForceUpdate")))
})

export {}
