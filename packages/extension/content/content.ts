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

onWindowMessage("ComputationUpdates", payload => postPortMessage("ComputationUpdates", payload))

onWindowMessage("SignalUpdates", payload => postPortMessage("SignalUpdates", payload))

onWindowMessage("OwnerDetailsUpdate", payload => postPortMessage("OwnerDetailsUpdate", payload))

onPortMessage("PanelVisibility", visible => postWindowMessage("PanelVisibility", visible))

once(onPortMessage, "ForceUpdate", () => postWindowMessage("ForceUpdate"))

onPortMessage("SetFocusedOwner", ownerId => postWindowMessage("SetFocusedOwner", ownerId))

export {}
