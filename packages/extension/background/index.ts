import { createCallbackStack } from "@solid-primitives/utils"
import { MESSAGE, once } from "@shared/messanger"
import { createPortMessanger, createRuntimeMessanger } from "../shared/utils"
import { DEVTOOLS_CONTENT_PORT } from "../shared/variables"

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
		postRuntimeMessage(MESSAGE.ResetPanel)
		clearListeners()
	}

	port = newPort
	lastDocumentId = newPort.sender?.documentId

	const { postPortMessage, onPortMessage } = createPortMessanger(port)

	addCleanup(
		onPortMessage(MESSAGE.SolidOnPage, () => {
			solidOnPage = true
			postRuntimeMessage(MESSAGE.SolidOnPage)
			// respond with page visibility to the debugger, to let him know
			// if the panel is already created and visible (after page refresh)
			postPortMessage(MESSAGE.PanelVisibility, panelVisibility)
		}),
	)

	addCleanup(
		onPortMessage(MESSAGE.GraphUpdate, graph => postRuntimeMessage(MESSAGE.GraphUpdate, graph)),
	)

	addCleanup(
		onPortMessage(MESSAGE.BatchedUpdate, payload =>
			postRuntimeMessage(MESSAGE.BatchedUpdate, payload),
		),
	)

	addCleanup(
		onRuntimeMessage(MESSAGE.PanelVisibility, visibility => {
			panelVisibility = visibility
			postPortMessage(MESSAGE.PanelVisibility, visibility)
		}),
	)

	// make sure the devtools script will be triggered to create devtools panel
	addCleanup(
		once(onRuntimeMessage, MESSAGE.DevtoolsScriptConnected, () => {
			if (solidOnPage) postRuntimeMessage(MESSAGE.SolidOnPage)
		}),
	)

	addCleanup(onRuntimeMessage(MESSAGE.ForceUpdate, () => postPortMessage(MESSAGE.ForceUpdate)))
})

export {}
