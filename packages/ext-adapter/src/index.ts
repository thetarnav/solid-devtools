import { createEffect, createSignal } from "solid-js"
import { registerDebuggerPlugin, PluginFactory } from "@solid-devtools/debugger"
import { registerLocatorPlugin } from "@solid-devtools/locator"
import {
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from "@solid-devtools/shared/bridge"
import { warn } from "@solid-devtools/shared/utils"

startListeningWindowMessages()

const extensionAdapterFactory: PluginFactory = ({
  forceTriggerUpdate,
  rootsUpdates,
  roots,
  handleComputationUpdates,
  handleSignalUpdates,
  setFocusedOwner,
  focusedState,
  setSelectedSignal,
}) => {
  const [enabled, setEnabled] = createSignal(false)

  postWindowMessage("SolidOnPage", process.env.VERSION!)

  // update the graph only if the devtools panel is in view
  onWindowMessage("PanelVisibility", v => {
    if (!v) return setEnabled(false)
    const current = enabled()
    // the panel might have been closed and opened again—in that case we want to update the graph
    if (current) {
      setFocusedOwner(null)
      forceTriggerUpdate()
    } else setEnabled(true)
  })
  onWindowMessage("ForceUpdate", forceTriggerUpdate)
  onWindowMessage("SetSelectedOwner", setFocusedOwner)
  onWindowMessage("SetSelectedSignal", ({ id, selected }) => {
    const value = setSelectedSignal({ id, selected })
    if (value) postWindowMessage("SignalValue", { id, value })
  })

  // diff the roots, and send only the changed roots (edited, deleted, added)
  createEffect(() => {
    postWindowMessage("GraphUpdate", rootsUpdates())
  })

  // send the computation updates
  handleComputationUpdates(updates => {
    postWindowMessage("ComputationUpdates", updates)
  })

  // send the signal updates
  handleSignalUpdates(updates => {
    postWindowMessage("SignalUpdates", updates)
  })

  // send the focused owner details
  createEffect(() => {
    const details = focusedState.details
    if (details) postWindowMessage("OwnerDetailsUpdate", details)
  })

  const { selected: selectedComponent, setTargetElement } = registerLocatorPlugin({
    enabled,
    onClick: (e, data) => {
      e.preventDefault()
      e.stopPropagation()
      console.log("onClick", e, data)
      return false
    },
  })

  onWindowMessage("HighlightElement", payload => {
    if (!payload) return setTargetElement(null)
    if ("rootId" in payload) {
      // highlight component
      const { rootId, nodeId } = payload
      const root = roots()[rootId]
      if (!root) return warn("No root found", rootId)
      const component = root.components()[nodeId]
      if (!component) return warn("No component found", nodeId)
      const el = component.resolved
      // TODO: if both element and component is known, there is no need to search for it.
      if (el instanceof HTMLElement) setTargetElement(el)
    } else {
      // highlight signal
      // TODO
    }
    // TODO: un-highlight
  })

  return { enabled }
}

let registered = false
/**
 * Registers the extension adapter with the debugger.
 */
export function useExtensionAdapter() {
  if (registered) return warn("Extension adapter already registered")
  registered = true
  registerDebuggerPlugin(data => {
    const { enabled } = extensionAdapterFactory(data)
    return {
      enabled,
      observeComputations: enabled,
    }
  })
}
