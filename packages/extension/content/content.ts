import {
  MESSAGE,
  once,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from "@shared/messanger"
import { createPortMessanger, DEVTOOLS_CONTENT_PORT } from "../shared/messanger"

console.log("content script working")

const port = chrome.runtime.connect({ name: DEVTOOLS_CONTENT_PORT })

startListeningWindowMessages()
const { postPortMessage, onPortMessage } = createPortMessanger(port)

onWindowMessage(MESSAGE.SolidOnPage, () => postPortMessage(MESSAGE.SolidOnPage))

onWindowMessage(MESSAGE.GraphUpdate, graph => postPortMessage(MESSAGE.GraphUpdate, graph))

onWindowMessage(MESSAGE.BatchedUpdate, payload => postPortMessage(MESSAGE.BatchedUpdate, payload))

onPortMessage(MESSAGE.PanelVisibility, visible =>
  postWindowMessage(MESSAGE.PanelVisibility, visible),
)

once(onPortMessage, MESSAGE.DevtoolsScriptConnected, () =>
  postWindowMessage(MESSAGE.DevtoolsScriptConnected),
)

once(onPortMessage, MESSAGE.ForceUpdate, () => postWindowMessage(MESSAGE.ForceUpdate))

export {}
