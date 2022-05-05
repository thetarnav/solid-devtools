// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import realWorld from "./real-world?script&module"

// Scripts wanting to use the real Window object (e.g. Solid detection)
// need to be injected to the page and evaluated
// Window in content-scripts is not the same

const script = document.createElement("script")
script.src = chrome.runtime.getURL(realWorld)
script.type = "module"
script.addEventListener("error", err => {
  console.log("Real world script failed to load.")
  console.error(err)
})
document.head.append(script)

export {}
