import {
  once,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from "@shared/bridge"
import { createPortMessanger, DEVTOOLS_CONTENT_PORT } from "../shared/bridge"

console.log("content script working")

const port = chrome.runtime.connect({ name: DEVTOOLS_CONTENT_PORT })

startListeningWindowMessages()
const { postPortMessage, onPortMessage } = createPortMessanger(port)

onWindowMessage("SolidOnPage", () => postPortMessage("SolidOnPage", true))

onWindowMessage("GraphUpdate", graph => postPortMessage("GraphUpdate", graph))

onWindowMessage("BatchedUpdate", payload => postPortMessage("BatchedUpdate", payload))

onPortMessage("PanelVisibility", visible => postWindowMessage("PanelVisibility", visible))

once(onPortMessage, "DevtoolsScriptConnected", () =>
  postWindowMessage("DevtoolsScriptConnected", true),
)

once(onPortMessage, "ForceUpdate", () => postWindowMessage("ForceUpdate", true))

export {}
