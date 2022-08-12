import { createEffect, createRoot, on } from "solid-js"
import { createRuntimeMessanger } from "../../shared/messanger"
import { handleComputationsUpdate, handleGraphUpdate, resetGraph } from "./graph"
import { focused, focusedRootId, updateDetails } from "./details"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()
postRuntimeMessage("ForceUpdate")

onRuntimeMessage("GraphUpdate", update => {
  handleGraphUpdate(update)
})

onRuntimeMessage("ResetPanel", () => {
  resetGraph()
})

onRuntimeMessage("ComputationsUpdate", updates => {
  handleComputationsUpdate(updates.map(u => u.nodeId))
})

onRuntimeMessage("OwnerDetailsUpdate", details => {
  updateDetails(details)
})

createRoot(() => {
  createEffect(
    on(
      [focused, focusedRootId],
      ([owner, rootId]) => {
        if (owner && rootId) postRuntimeMessage("SetFocusedOwner", { ownerId: owner?.id, rootId })
        else postRuntimeMessage("SetFocusedOwner", null)
      },
      { defer: true },
    ),
  )
})
