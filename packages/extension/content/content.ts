import {
	MESSAGE,
	once,
	onWindowMessage,
	postWindowMessage,
	startListeningWindowMessages,
} from "@shared/messanger"
import { createPortMessanger } from "../shared/utils"
import { DEVTOOLS_CONTENT_PORT } from "../shared/variables"

console.log("content script working")

const port = chrome.runtime.connect({ name: DEVTOOLS_CONTENT_PORT })

startListeningWindowMessages()
const { postPortMessage, onPortMessage } = createPortMessanger(port)

// content -> bg
postPortMessage(MESSAGE.Hello, "hello from content script")

// bg -> content
onPortMessage(MESSAGE.Hello, greeting => {
	console.log("In content script, received a greeting:", greeting)
})

onWindowMessage(MESSAGE.SolidOnPage, () => postPortMessage(MESSAGE.SolidOnPage))

onWindowMessage(MESSAGE.GraphUpdate, graph => postPortMessage(MESSAGE.GraphUpdate, graph))

onWindowMessage(MESSAGE.BatchedUpdate, payload => postPortMessage(MESSAGE.BatchedUpdate, payload))

onPortMessage(MESSAGE.PanelVisibility, visible =>
	postWindowMessage(MESSAGE.PanelVisibility, visible),
)

once(onPortMessage, MESSAGE.DevtoolsScriptConnected, () =>
	postWindowMessage(MESSAGE.DevtoolsScriptConnected),
)

export {}
