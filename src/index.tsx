/* @refresh reload */
import { render } from "solid-js/web"

console.log("devtools (Panel) page working")

// bg -> devtools
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("devtools got message", message, sender)
  sendResponse("devtools response")
})

// devtools -> bg
chrome.runtime.sendMessage("Hello from Devtools", response => {
  console.log("Got response in Devtools", response)
})

import "./index.css"
import App from "./App"

render(() => <App />, document.getElementById("root") as HTMLElement)
