import { createCallbackStack } from "@solid-primitives/utils"
import { once } from "@solid-devtools/shared/bridge"
import {
  createPortMessanger,
  createRuntimeMessanger,
  DEVTOOLS_CONTENT_PORT,
} from "../shared/messanger"

console.log("background script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let port: chrome.runtime.Port | undefined
let lastDocumentId: string | undefined
let panelVisibility = false
let solidOnPage = false

const { push: addCleanup, execute: clearListeners } = createCallbackStack()

chrome.runtime.onConnect.addListener(newPort => {
  if (newPort.name !== DEVTOOLS_CONTENT_PORT)
    return console.log("Ignored connection:", newPort.name)

  if (port) {
    console.log(`Switching BG Ports: ${port.sender?.documentId} -> ${newPort.sender?.documentId}`)
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
    onPortMessage("BatchedUpdate", payload => postRuntimeMessage("BatchedUpdate", payload)),
  )

  addCleanup(
    onRuntimeMessage("PanelVisibility", visibility => {
      panelVisibility = visibility
      postPortMessage("PanelVisibility", visibility)
    }),
  )

  // make sure the devtools script will be triggered to create devtools panel
  addCleanup(
    once(onRuntimeMessage, "DevtoolsScriptConnected", () => {
      if (solidOnPage) postRuntimeMessage("SolidOnPage")
    }),
  )

  addCleanup(onRuntimeMessage("ForceUpdate", () => postPortMessage("ForceUpdate")))
})

export {}
