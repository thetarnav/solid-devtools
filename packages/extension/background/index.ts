import { MESSAGE } from "@shared/messanger"
import { createPortMessanger, createRuntimeMessanger } from "@/shared/utils"
import { DEVTOOLS_CONTENT_PORT } from "../shared/variables"

console.log("background script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let port: chrome.runtime.Port | undefined

chrome.runtime.onConnect.addListener(newPort => {
	if (newPort.name !== DEVTOOLS_CONTENT_PORT)
		return console.log("Ignored connection:", newPort.name)

	// refreshing was messing with this: (idk why yet)
	// if (port) return console.log("Port already assigned.")

	port = newPort

	const { postPortMessage, onPortMessage } = createPortMessanger(port)

	// bg -> content
	postPortMessage(MESSAGE.Hello, "Hello from background script!")

	// content -> bg
	onPortMessage(MESSAGE.Hello, greeting => console.log("BG received a Port greeting:", greeting))

	onPortMessage(MESSAGE.SolidOnPage, solidOnPage =>
		postRuntimeMessage(MESSAGE.SolidOnPage, solidOnPage),
	)
})

// panel -> bg
onRuntimeMessage(MESSAGE.Hello, (greeting, respond) => {
	console.log("BG received a Runtime greeting:", greeting)
	respond("Hi I'm BG :)")
})

// bg -> panel
postRuntimeMessage(MESSAGE.Hello, "hi from background", response => {
	console.log(`background got response:`, response)
})

export {}
