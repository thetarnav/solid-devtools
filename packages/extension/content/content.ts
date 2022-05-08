import { MESSAGE, onWindowMessage, startListeningWindowMessages } from "@shared/messanger"
import { createPortMessanger } from "@/shared/utils"
import { DEVTOOLS_CONTENT_PORT } from "@/shared/variables"

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

document.body.addEventListener("click", function () {
	// content -> bg
	port.postMessage({ greeting: "they clicked the page!" })
})

// TODO: add unsubscribe logic (needs to only happen once)
onWindowMessage(MESSAGE.SolidOnPage, solidOnPage =>
	postPortMessage(MESSAGE.SolidOnPage, solidOnPage),
)

onWindowMessage(MESSAGE.SolidUpdate, tree => postPortMessage(MESSAGE.SolidUpdate, tree))

export {}
