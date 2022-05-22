import { MESSAGE, once } from "@shared/messanger"
import { createPortMessanger, createRuntimeMessanger } from "../shared/utils"
import { DEVTOOLS_CONTENT_PORT } from "../shared/variables"

console.log("background script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let port: chrome.runtime.Port | undefined
let lastDocumentId: string | undefined

chrome.runtime.onConnect.addListener(newPort => {
	if (newPort.name !== DEVTOOLS_CONTENT_PORT)
		return console.log("Ignored connection:", newPort.name)

	if (port) {
		console.log(`Switching BG Ports: ${port.sender?.documentId} -> ${newPort.sender?.documentId}`)
		postRuntimeMessage(MESSAGE.ResetPanel)
	}

	port = newPort
	lastDocumentId = newPort.sender?.documentId

	const { postPortMessage, onPortMessage } = createPortMessanger(port)

	// bg -> content
	postPortMessage(MESSAGE.Hello, "Hello from background script!")

	// content -> bg
	onPortMessage(MESSAGE.Hello, greeting => console.log("BG received a Port greeting:", greeting))

	onPortMessage(MESSAGE.SolidOnPage, () => postRuntimeMessage(MESSAGE.SolidOnPage))

	onPortMessage(MESSAGE.GraphUpdate, graph => postRuntimeMessage(MESSAGE.GraphUpdate, graph))

	onPortMessage(MESSAGE.BatchedUpdate, payload =>
		postRuntimeMessage(MESSAGE.BatchedUpdate, payload),
	)

	onRuntimeMessage(MESSAGE.PanelVisibility, visibility =>
		postPortMessage(MESSAGE.PanelVisibility, visibility),
	)

	once(onRuntimeMessage, MESSAGE.DevtoolsScriptConnected, () =>
		postPortMessage(MESSAGE.DevtoolsScriptConnected),
	)
})

// panel -> bg
onRuntimeMessage(MESSAGE.Hello, greeting => {
	console.log("BG received a Runtime greeting:", greeting)
})

// bg -> panel
postRuntimeMessage(MESSAGE.Hello, "hi from background")

export {}
