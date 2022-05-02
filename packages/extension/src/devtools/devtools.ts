chrome.devtools.panels.create(
  "Solid Devtools",
  "icons/solid-normal-32.png",
  "src/index.html",
  panel => {
    if (chrome.runtime.lastError) console.error(chrome.runtime.lastError)
    console.log("panel", panel)
  }
)

export {}
