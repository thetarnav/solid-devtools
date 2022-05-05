import { createRuntimeMessanger } from "@/shared/utils"
import { MESSAGE } from "@/shared/variables"

console.log("devtools script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

let panel: chrome.devtools.panels.ExtensionPanel | undefined

onRuntimeMessage(MESSAGE.SolidOnPage, async solidOnPage => {
  if (solidOnPage) {
    if (panel) return console.log("Panel already exists")

    console.log("Solid on page – creating panel")
    try {
      panel = await createPanel()
      console.log("panel", panel)
      panel.onShown.addListener(onPanelShown)
      panel.onHidden.addListener(onPanelHidden)
    } catch (error) {
      console.error(error)
    }
  } else {
    console.warn("Solid NOT on page – NOT creating panel")
  }
})

const createPanel = () =>
  new Promise<chrome.devtools.panels.ExtensionPanel>((resolve, reject) => {
    chrome.devtools.panels.create(
      "Solid Devtools",
      "assets/icons/solid-normal-32.png",
      "panel/index.html",
      newPanel => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(newPanel)
      }
    )
  })

function onPanelShown() {
  postRuntimeMessage(MESSAGE.PanelVisibility, true)
}

function onPanelHidden() {
  postRuntimeMessage(MESSAGE.PanelVisibility, false)
}

export {}
