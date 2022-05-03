import { CONTENT_PORT_NAME } from "@/shared/variables"

console.log("content script working")

const port = chrome.runtime.connect({ name: CONTENT_PORT_NAME })

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

export {}
