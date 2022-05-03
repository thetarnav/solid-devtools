import { MESSAGE } from "@/shared/variables"

console.log("devtools script working")

// TODO: wrap entire messaging system with typesafe functions
chrome.runtime.onMessage.addListener(message => {
  if (message && message.id === MESSAGE.SOLID_ON_PAGE) {
    if (message.payload) {
      console.log("Solid on page – creating panel")
      createPanel()
    } else {
      console.warn("Solid not on page – NOT creating panel")
    }
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
  chrome.runtime.sendMessage("solid-panel-shown")
}

function onPanelHidden() {
  chrome.runtime.sendMessage("solid-panel-hidden")
}

export {}
