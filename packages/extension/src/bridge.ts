import { createEffect, createRoot, on } from "solid-js"
import { Messages } from "@solid-devtools/shared/bridge"
import { NodeType } from "@solid-devtools/shared/graph"
import { createRuntimeMessanger } from "../shared/messanger"
import * as Graph from "./state/graph"
import * as Details from "./state/details"
import * as Selected from "./state/selected"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

// in development — force update the graph on load to work with hot reloading
if (import.meta.env.DEV) {
  postRuntimeMessage("ForceUpdate")
}

onRuntimeMessage("GraphUpdate", update => {
  Graph.handleGraphUpdate(update)
  Details.handleGraphUpdate()
})

onRuntimeMessage("ResetPanel", () => {
  Graph.resetGraph()
  Details.handleGraphUpdate()
  Selected.setOtherLocator(false)
  Selected.setExtLocator(false)
})

onRuntimeMessage("ComputationUpdates", updates => {
  Graph.handleComputationsUpdate(updates.map(u => u.id))
})

onRuntimeMessage("SignalUpdates", Details.handleSignalUpdates)
onRuntimeMessage("SignalValue", update => {
  // updates the signal value but without causing it to highlight
  Details.handleSignalUpdates([update], false)
})
onRuntimeMessage("PropsUpdate", Details.handlePropsUpdate)

onRuntimeMessage("OwnerDetailsUpdate", details => {
  Details.updateDetails(details)
})

// let visibility = false
// onRuntimeMessage("PanelVisibility", newVisibility => {
//   visibility = newVisibility
//   if (visibility) {
//     // panel
//   }
//   log("PanelVisibility", visibility)
// })

createRoot(() => {
  onRuntimeMessage("AdpLocatorMode", Selected.setOtherLocator)
  createEffect(
    on(Selected.extLocatorEnabled, state => postRuntimeMessage("ExtLocatorMode", state), {
      defer: true,
    }),
  )

  onRuntimeMessage("SendSelectedOwner", Details.setSelectedNode)

  // toggle selected owner
  createEffect(
    on(
      [Details.focused, Details.focusedRootId],
      ([owner, rootId]) => {
        const payload = owner && rootId ? { nodeId: owner.id, rootId } : null
        postRuntimeMessage("SetSelectedOwner", payload)
      },
      { defer: true },
    ),
  )

  onRuntimeMessage("SetHoveredOwner", ({ state, nodeId }) => {
    // do not sync this state back to the adapter
    Graph.toggleHoveredOwner(nodeId, state, false)
  })

  let initHighlight = true
  // toggle hovered html element
  createEffect<Messages["HighlightElement"] | undefined>(prev => {
    // tracks
    const { rootId, owner, sync } = Graph.hovered()
    const elId = Details.hoveredElement()

    // skip initial value
    if (initHighlight) return (initHighlight = false) || undefined

    // handle component
    if (rootId && owner && owner.type === NodeType.Component) {
      // do not send the same message twice & skip state without the `sync` flag
      if ((prev && typeof prev === "object" && prev.nodeId === owner.id) || !sync) return prev
      const payload = { rootId, nodeId: owner.id }
      postRuntimeMessage("HighlightElement", payload)
      return payload
    }
    // handle element
    if (elId) {
      // do not send the same message twice
      if (typeof prev === "string" && prev === elId) return prev
      postRuntimeMessage("HighlightElement", elId)
      return elId
    }
    // no element or component
    if (prev) postRuntimeMessage("HighlightElement", null)
  })

  // toggle selected signals
  Details.setOnInspectValue(payload => postRuntimeMessage("ToggleInspectedValue", payload))
})
