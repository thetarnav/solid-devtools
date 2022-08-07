import {
  once,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from "@solid-devtools/shared/bridge"
import { log } from "@solid-devtools/shared/utils"
import { createPortMessanger, DEVTOOLS_CONTENT_PORT } from "../shared/messanger"

log("content script working")

const port = chrome.runtime.connect({ name: DEVTOOLS_CONTENT_PORT })

startListeningWindowMessages()
const { postPortMessage, onPortMessage } = createPortMessanger(port)

onWindowMessage("SolidOnPage", () => postPortMessage("SolidOnPage"))

onWindowMessage("GraphUpdate", graph => postPortMessage("GraphUpdate", graph))

onWindowMessage("BatchedUpdate", payload => postPortMessage("BatchedUpdate", payload))

onPortMessage("PanelVisibility", visible => postWindowMessage("PanelVisibility", visible))

once(onPortMessage, "DevtoolsScriptConnected", () => postWindowMessage("DevtoolsScriptConnected"))

once(onPortMessage, "ForceUpdate", () => postWindowMessage("ForceUpdate"))

export {}
