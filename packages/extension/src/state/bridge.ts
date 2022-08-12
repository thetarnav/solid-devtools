import { createEffect, createRoot, on } from "solid-js"
import { NodeID } from "@solid-devtools/shared/graph"
import { createRuntimeMessanger } from "../../shared/messanger"
import { handleComputationsUpdate, handleGraphUpdate, resetGraph } from "./graph"
import { focusedMeta, updateDetails } from "./details"

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
  createEffect(on(focusedMeta, postFocusedOwner, { defer: true }))
})

export function postFocusedOwner(payload: { rootId: NodeID; ownerId: NodeID } | null) {
  postRuntimeMessage("SetFocusedOwner", payload)
}
