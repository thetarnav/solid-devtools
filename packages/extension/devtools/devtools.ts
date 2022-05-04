import { createRuntimeMessanger } from "@/shared/utils"
import { MESSAGE } from "@/shared/variables"

console.log("devtools script working")

const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

onRuntimeMessage(MESSAGE.SolidOnPage, solidOnPage => {
  if (solidOnPage) {
    console.log("Solid on page – creating panel")
    createPanel()
  } else {
    console.warn("Solid not on page – NOT creating panel")
  }
})

function createPanel() {
  chrome.devtools.panels.create(
    "Solid Devtools",
    "assets/icons/solid-normal-32.png",
    "panel/index.html",
    panel => {
      if (chrome.runtime.lastError) console.error(chrome.runtime.lastError)
      console.log("panel", panel)
      panel.onShown.addListener(onPanelShown)
      panel.onHidden.addListener(onPanelHidden)
    }
  )
}

function onPanelShown() {
  postRuntimeMessage(MESSAGE.PanelVisibility, true)
}

function onPanelHidden() {
  postRuntimeMessage(MESSAGE.PanelVisibility, false)
}

export {}
