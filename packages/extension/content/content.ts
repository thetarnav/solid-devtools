import {
  once,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from "@solid-devtools/shared/bridge"
import { warn } from "@solid-devtools/shared/utils"
import { createPortMessanger, DEVTOOLS_CONTENT_PORT } from "../shared/messanger"

const toVersionTuple = (version: string) =>
  version.split(".").map(Number) as [number, number, number]

const extVersion = chrome.runtime.getManifest().version
const wantedAdapterVersion = __ADAPTER_VERSION__

const port = chrome.runtime.connect({ name: DEVTOOLS_CONTENT_PORT })

startListeningWindowMessages()
const { postPortMessage, onPortMessage } = createPortMessanger(port)

onWindowMessage("SolidOnPage", adapterVersion => {
  console.log(
    "🚧 %csolid-devtools%c is in early development! 🚧\nPlease report any bugs to https://github.com/thetarnav/solid-devtools/issues",
    "color: #fff; background: rgba(181, 111, 22, 0.7); padding: 1px 4px;",
    "color: #e38b1b",
  )

  // warn if the matching adapter version is not the same minor version range as the actual adapter
  const adapterTuple = toVersionTuple(adapterVersion)
  const wantedTuple = toVersionTuple(wantedAdapterVersion)

  // match only major and minor version
  for (let i = 0; i < 2; i++) {
    if (adapterTuple[i] !== wantedTuple[i]) {
      warn(
        `${i === 0 ? "MAJOR" : "MINOR"} VERSION MISMATCH!
Extension version: ${extVersion}
Adapter version: ${adapterVersion}
Matching adapter version: ${wantedAdapterVersion}`,
      )
      break
    }
  }

  postPortMessage("SolidOnPage", "")
})

onWindowMessage("ResetPanel", () => postPortMessage("ResetPanel"))

onWindowMessage("GraphUpdate", graph => postPortMessage("GraphUpdate", graph))

onWindowMessage("ComputationUpdates", e => postPortMessage("ComputationUpdates", e))

onWindowMessage("SignalUpdates", e => postPortMessage("SignalUpdates", e))
onWindowMessage("SignalValue", e => postPortMessage("SignalValue", e))

onWindowMessage("OwnerDetailsUpdate", e => postPortMessage("OwnerDetailsUpdate", e))

onWindowMessage("PropsUpdate", e => postPortMessage("PropsUpdate", e))

onWindowMessage("SetHoveredOwner", e => postPortMessage("SetHoveredOwner", e))

onWindowMessage("SendSelectedOwner", e => postPortMessage("SendSelectedOwner", e))

onPortMessage("PanelVisibility", e => postWindowMessage("PanelVisibility", e))
onPortMessage("PanelClosed", e => postWindowMessage("PanelClosed", e))

onPortMessage("ForceUpdate", () => postWindowMessage("ForceUpdate"))

onPortMessage("SetSelectedOwner", e => postWindowMessage("SetSelectedOwner", e))

onPortMessage("ToggleInspectedValue", e => postWindowMessage("ToggleInspectedValue", e))

onPortMessage("HighlightElement", e => postWindowMessage("HighlightElement", e))

onWindowMessage("AdpLocatorMode", e => postPortMessage("AdpLocatorMode", e))
onPortMessage("ExtLocatorMode", e => postWindowMessage("ExtLocatorMode", e))

onPortMessage("SetOmitRefresh", e => postWindowMessage("SetOmitRefresh", e))

export {}
