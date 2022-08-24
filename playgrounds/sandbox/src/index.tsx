/* @refresh reload */
import { render } from "solid-js/web"
import { useLocator } from "solid-devtools"

import App from "./App"

useLocator({
  targetIDE: "vscode",
})

export const disposeApp = render(() => <App />, document.getElementById("root")!)
