import { createEffect, createRoot, on } from "solid-js"
import { createRuntimeMessanger } from "../../shared/messanger"
import {
  handleComputationsUpdate,
  handleGraphUpdate,
  hovered,
  resetGraph,
  toggleHoveredOwner,
} from "./graph"
import {
  focused,
  focusedRootId,
  handleSignalUpdates,
  updateDetails,
  handleGraphUpdate as detailsHandleGraphUpdate,
  setOnSignalSelect,
  hoveredElement,
} from "./details"
import { Messages } from "@solid-devtools/shared/bridge"
import { NodeType } from "@solid-devtools/shared/graph"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

// in development — force update the graph on load to work with hot reloading
if (import.meta.env.DEV) {
  postRuntimeMessage("ForceUpdate")
}

onRuntimeMessage("GraphUpdate", update => {
  handleGraphUpdate(update)
  detailsHandleGraphUpdate()
})

onRuntimeMessage("ResetPanel", () => {
  resetGraph()
  detailsHandleGraphUpdate()
})

onRuntimeMessage("ComputationUpdates", updates => {
  handleComputationsUpdate(updates.map(u => u.id))
})

onRuntimeMessage("SignalUpdates", updates => {
  handleSignalUpdates(updates)
})

onRuntimeMessage("OwnerDetailsUpdate", details => {
  updateDetails(details)
})

onRuntimeMessage("SignalValue", update => {
  // updates the signal value but without causing it to highlight
  handleSignalUpdates([update], false)
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
  // toggle selected owner
  createEffect(
    on(
      [focused, focusedRootId],
      ([owner, rootId]) => {
        const payload = owner && rootId ? { ownerId: owner.id, rootId } : null
        postRuntimeMessage("SetSelectedOwner", payload)
      },
      { defer: true },
    ),
  )

  onRuntimeMessage("SetHoveredOwner", ({ state, nodeId }) => {
    // do not sync this state back to the adapter
    toggleHoveredOwner(nodeId, state, false)
  })

  let initHighlight = true
  // toggle hovered html element
  createEffect<Messages["HighlightElement"] | undefined>(prev => {
    // tracks
    const { rootId, owner, sync } = hovered()
    const elId = hoveredElement()

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
  setOnSignalSelect((id, selected) => {
    postRuntimeMessage("SetSelectedSignal", { id, selected })
  })
})
