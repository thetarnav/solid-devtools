import { createEffect, createSignal } from "solid-js"
import { registerDebuggerPlugin, PluginFactory } from "@solid-devtools/debugger"
import {
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from "@solid-devtools/shared/bridge"

startListeningWindowMessages()

const extensionAdapterFactory: PluginFactory = ({
  forceTriggerUpdate,
  rootsUpdates,
  handleComputationsUpdate,
  setFocusedOwner,
}) => {
  const [enabled, setEnabled] = createSignal(false)

  postWindowMessage("SolidOnPage")

  // update the graph only if the devtools panel is in view
  onWindowMessage("PanelVisibility", setEnabled)
  onWindowMessage("ForceUpdate", forceTriggerUpdate)
  onWindowMessage("SetFocusedOwner", setFocusedOwner)

  // diff the roots, and send only the changed roots (edited, deleted, added)
  createEffect(() => {
    postWindowMessage("GraphUpdate", rootsUpdates())
  })

  handleComputationsUpdate(updates => {
    postWindowMessage("ComputationsUpdate", updates)
  })

  return { enabled }
}

let registered = false

/**
 * Registers the extension adapter with the debugger.
 */
export function useExtensionAdapter() {
  if (registered) return console.warn("Extension adapter already registered")
  registered = true
  registerDebuggerPlugin(data => {
    const { enabled } = extensionAdapterFactory(data)
    return {
      enabled,
      observeComputations: enabled,
    }
  })
}
