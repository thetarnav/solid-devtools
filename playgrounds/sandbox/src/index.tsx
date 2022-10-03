/* @refresh reload */
import { render } from "solid-js/web"
import "solid-devtools"
import { useLocator } from "solid-devtools"

import App from "./App"
import { ThemeProvider } from "./Theme"

useLocator({
  targetIDE: "vscode",
})

export const disposeApp = render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
)
