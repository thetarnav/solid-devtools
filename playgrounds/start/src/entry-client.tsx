import { mount, StartClient } from "solid-start/entry-client"
import "solid-devtools"
import { useLocator } from "solid-devtools"

useLocator({
  targetIDE: "vscode",
})

mount(() => <StartClient />, document)
