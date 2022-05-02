console.log("content script working")

let port = chrome.runtime.connect({ name: "port-from-cs" })

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
