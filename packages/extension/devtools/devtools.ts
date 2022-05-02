chrome.devtools.panels.create(
  "Solid Devtools",
  "assets/icons/solid-normal-32.png",
  "panel/index.html",
  panel => {
    if (chrome.runtime.lastError) console.error(chrome.runtime.lastError)
    console.log("panel", panel)
  }
)

export {}
