/* @refresh reload */
import { render } from "solid-js/web"

console.log("panel working")

// bg -> panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("panel got message", message, sender)
  sendResponse("panel response")
})

// panel -> bg
chrome.runtime.sendMessage("Hello from panel", response => {
  console.log("Got response in panel", response)
})

import "./index.css"
import App from "./App"

render(() => <App />, document.getElementById("root") as HTMLElement)
