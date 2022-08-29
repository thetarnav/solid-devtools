import { createCallbackStack } from "@solid-primitives/utils"
import { log } from "@solid-devtools/shared/utils"
import {
  createPortMessanger,
  createRuntimeMessanger,
  DEVTOOLS_CONTENT_PORT,
} from "../shared/messanger"

log("background script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let port: chrome.runtime.Port | undefined
let lastDocumentId: string | undefined

// state reused between panels
let panelVisibility = false
let solidOnPage = false

const { push: addCleanup, execute: clearListeners } = createCallbackStack()

chrome.runtime.onConnect.addListener(newPort => {
  if (newPort.name !== DEVTOOLS_CONTENT_PORT) return log("Ignored connection:", newPort.name)

  if (port) {
    log(`Switching BG Ports: ${port.sender?.documentId} -> ${newPort.sender?.documentId}`)
    postRuntimeMessage("ResetPanel")
    clearListeners()
  }

  port = newPort
  lastDocumentId = newPort.sender?.documentId

  const { postPortMessage, onPortMessage } = createPortMessanger(port)

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
    onRuntimeMessage("DevtoolsScriptConnected", () => {
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
