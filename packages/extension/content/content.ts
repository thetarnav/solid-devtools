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

  postPortMessage("SolidOnPage")
})

onWindowMessage("GraphUpdate", graph => postPortMessage("GraphUpdate", graph))

onWindowMessage("ComputationUpdates", payload => postPortMessage("ComputationUpdates", payload))

onWindowMessage("SignalUpdates", payload => postPortMessage("SignalUpdates", payload))

onWindowMessage("OwnerDetailsUpdate", payload => postPortMessage("OwnerDetailsUpdate", payload))

onWindowMessage("SignalValue", payload => postPortMessage("SignalValue", payload))

onWindowMessage("SetHoveredOwner", payload => postPortMessage("SetHoveredOwner", payload))

onPortMessage("PanelVisibility", visible => postWindowMessage("PanelVisibility", visible))

once(onPortMessage, "ForceUpdate", () => postWindowMessage("ForceUpdate"))

onPortMessage("SetSelectedOwner", payload => postWindowMessage("SetSelectedOwner", payload))

onPortMessage("SetSelectedSignal", payload => postWindowMessage("SetSelectedSignal", payload))

onPortMessage("HighlightElement", payload => postWindowMessage("HighlightElement", payload))

export {}
