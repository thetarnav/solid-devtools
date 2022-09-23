export { default as locator } from "./locator"

export { default as structure } from "./structure"
export type { Structure } from "./structure"

export { default as inspector } from "./inspector"
export type { Inspector } from "./inspector"

import { RootsUpdates } from "@solid-devtools/shared/graph"
import inspector from "./inspector"
import structure from "./structure"

//
// Dispatched Actions
//

export function updateStructure(updates: RootsUpdates | null) {
  if (updates) {
    structure.updateStructure(updates)
  } else {
    structure.resetStructure()
  }
  inspector.clearUpdated()
}
