import { CONTENT_PORT_NAME } from "../shared/variables"

console.log("background script working")

const { onConnect, onMessage, sendMessage } = chrome.runtime

let port: chrome.runtime.Port | undefined

onConnect.addListener(newPort => {
  if (newPort.name !== CONTENT_PORT_NAME) return console.log("Ignored connection:", newPort.name)

  // refreshing was messing with this: (idk why yet)
  // if (port) return console.log("Port already assigned.")

  port = newPort

  // bg -> content
  port.postMessage({ greeting: "hi there content script!" })

  // content -> bg
  port.onMessage.addListener(function (m) {
    console.log("In background script, received message from content script", m)
  })
})

// panel -> bg
onMessage.addListener((message, sender, sendResponse) => {
  console.log("background got message", message, sender)
  sendResponse("bg response")
})

// bg -> panel
sendMessage(`hi from background`, response => {
  console.log(`background got response:`, response)
})

export {}
