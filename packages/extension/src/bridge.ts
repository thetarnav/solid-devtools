import { batch, createEffect, createRoot, on, untrack } from "solid-js"
import { Messages } from "@solid-devtools/shared/bridge"
import { NodeType } from "@solid-devtools/shared/graph"
import { createRuntimeMessanger } from "../shared/messanger"
import { structure, inspector, locator, updateStructure } from "@/state"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

// in development — force update the graph on load to work with hot reloading
if (import.meta.env.DEV) {
  postRuntimeMessage("ForceUpdate")
}

onRuntimeMessage("GraphUpdate", updateStructure)

onRuntimeMessage("ResetPanel", () => {
  batch(() => {
    updateStructure(null)
    locator.setClientLocatorState(false)
    locator.setExtLocator(false)
  })
})

onRuntimeMessage("ComputationUpdates", updates => {
  structure.addUpdatedComputations(updates.map(u => u.id))
})

onRuntimeMessage("SignalUpdates", inspector.handleSignalUpdates)
onRuntimeMessage("SignalValue", update => {
  // updates the signal value but without causing it to highlight
  inspector.handleSignalUpdates([update], false)
})
onRuntimeMessage("PropsUpdate", inspector.handlePropsUpdate)

onRuntimeMessage("OwnerDetailsUpdate", details => {
  inspector.updateDetails(details)
})

// let visibility = false
// onRuntimeMessage("PanelVisibility", newVisibility => {
//   visibility = newVisibility
//   if (visibility) {
//     // panel
//   }
//   log("PanelVisibility", visibility)
// })

// toggle selected signals
inspector.setOnInspectValue(payload => postRuntimeMessage("ToggleInspectedValue", payload))

createRoot(() => {
  onRuntimeMessage("ClientLocatorMode", locator.setClientLocatorState)
  createEffect(
    on(locator.extLocatorEnabled, state => postRuntimeMessage("ExtLocatorMode", state), {
      defer: true,
    }),
  )

  onRuntimeMessage("SetHoveredOwner", ({ state, nodeId }) => locator.toggleHovered(nodeId, state))

  onRuntimeMessage("SendSelectedOwner", inspector.setInspectedNode)

  // toggle selected owner
  createEffect(
    on(
      inspector.inspectedNode,
      node =>
        postRuntimeMessage(
          "SetSelectedOwner",
          node ? { nodeId: node.id, rootId: structure.getParentRoot(node).id } : null,
        ),
      { defer: true },
    ),
  )

  let initHighlight = true
  // toggle hovered html element
  createEffect<Messages["HighlightElement"] | undefined>(prev => {
    // tracks
    const hovered = structure.hovered()
    const elId = inspector.hoveredElement()

    return untrack(() => {
      // skip initial value
      if (initHighlight) return (initHighlight = false) || undefined

      // handle component
      if (hovered && hovered.type === NodeType.Component) {
        if (
          // if the hovered component is the same as the last one
          (prev && typeof prev === "object" && prev.nodeId === hovered.id) ||
          // ignore state that came from the client
          hovered.id === locator.clientHoveredId()
        )
          return prev

        const rootId = structure.getParentRoot(hovered).id
        const payload = { rootId, nodeId: hovered.id }
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
  })
})
