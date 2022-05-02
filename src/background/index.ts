console.log("background script working")

let port: chrome.runtime.Port

chrome.runtime.onConnect.addListener(_port => {
  port = _port
  // bg -> content
  port.postMessage({ greeting: "hi there content script!" })
  // content -> bg
  port.onMessage.addListener(function (m) {
    console.log("In background script, received message from content script", m)
  })
})

// devtools -> bg
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("background got message", message, sender)
  sendResponse("bg response")
})

// bg -> devtools
chrome.runtime.sendMessage(`hi from background`, response => {
  console.log(`background got response:`, response)
})

export {}
