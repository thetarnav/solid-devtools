import { createRuntimeMessanger, DEVTOOLS_CONNECTION_NAME } from "../shared/messanger"
import { once } from "@solid-devtools/shared/bridge"
import { log } from "@solid-devtools/shared/utils"

log("Devtools script working.")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

postRuntimeMessage("DevtoolsScriptConnected", chrome.devtools.inspectedWindow.tabId)

// Create a connection to the background page
chrome.runtime.connect({ name: DEVTOOLS_CONNECTION_NAME })

let panel: chrome.devtools.panels.ExtensionPanel | undefined

once(onRuntimeMessage, "SolidOnPage", async () => {
  if (panel) return log("Panel already exists.")

  log("Solid on page – creating panel...")
  try {
    panel = await createPanel()
    log("Panel created.")
    // console.log("panel", panel)
    panel.onShown.addListener(onPanelShown)
    panel.onHidden.addListener(onPanelHidden)
  } catch (error) {
    console.error(error)
  }
})

const createPanel = () =>
  new Promise<chrome.devtools.panels.ExtensionPanel>((resolve, reject) => {
    chrome.devtools.panels.create(
      "Solid",
      "assets/icons/solid-normal-32.png",
      "index.html",
      newPanel => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(newPanel)
      },
    )
  })

function onPanelShown() {
  postRuntimeMessage("PanelVisibility", true)
}

function onPanelHidden() {
  postRuntimeMessage("PanelVisibility", false)
}

export {}
