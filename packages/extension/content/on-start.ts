import { onMessage, startListeningForPostMessages } from "@/shared/utils"
import { DEVTOOLS_CONTENT_PORT, MESSAGE } from "@/shared/variables"

console.log("content script working")

startListeningForPostMessages()

const port = chrome.runtime.connect({ name: DEVTOOLS_CONTENT_PORT })

// content -> bg
port.postMessage({ greeting: "hello from content script" })

// bg -> content
port.onMessage.addListener(function (m) {
  console.log("In content script, received message from background script: ", m)
})

document.body.addEventListener("click", function () {
  // content -> bg
  port.postMessage({ greeting: "they clicked the page!" })
})

// TODO: add unsubscribe logic (needs to only happen once)
onMessage(MESSAGE.SOLID_ON_PAGE, solidOnPage => {
  port.postMessage({ id: MESSAGE.SOLID_ON_PAGE, payload: solidOnPage })
})

export {}
