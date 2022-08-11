import { GraphOwner } from "packages/shared/dist/graph"
import { Accessor, createMemo, createRoot, createSelector, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { findOwnerRootId } from "./graph"

const exports = createRoot(() => {
  const [state, setState] = createStore({})

  const [focused, setFocused] = createSignal<GraphOwner | null>(null)
  const ownerFocusedSelector = createSelector<GraphOwner | null, GraphOwner>(focused)

  const useOwnerFocusedSelector = (owner: GraphOwner): Accessor<boolean> =>
    ownerFocusedSelector.bind(void 0, owner)

  const focusedMeta = createMemo(() => {
    const owner = focused()
    if (!owner) return null
    const rootId = findOwnerRootId(owner)
    return { rootId, ownerId: owner.id }
  })

  return { focused, setFocused, useOwnerFocusedSelector, focusedMeta }
})
export const { focused, setFocused, useOwnerFocusedSelector, focusedMeta } = exports
