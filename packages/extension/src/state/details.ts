import { GraphOwner, MappedOwnerDetails, OwnerDetails } from "packages/shared/dist/graph"
import { Accessor, createMemo, createRoot, createSelector, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import { findOwnerRootId } from "./graph"

export type OwnerDetailsState = {
  focused: GraphOwner | null
  details: OwnerDetails | null
}

const exports = createRoot(() => {
  const [state, setState] = createStore<OwnerDetailsState>({
    focused: null,
    details: null,
  })

  const ownerFocusedSelector = createSelector<GraphOwner | null, GraphOwner>(() => state.focused)

  const useOwnerFocusedSelector = (owner: GraphOwner): Accessor<boolean> =>
    ownerFocusedSelector.bind(void 0, owner)

  const focusedMeta = createMemo(() => {
    const owner = state.focused
    if (!owner) return null
    const rootId = findOwnerRootId(owner)
    return { rootId, ownerId: owner.id }
  })

  function setFocused(owner: GraphOwner | null) {
    if (owner !== untrack(() => state.focused)) setState({ focused: owner, details: null })
  }

  function updateDetails(details: MappedOwnerDetails): void {}

  return {
    focused: () => state.focused,
    setFocused,
    useOwnerFocusedSelector,
    focusedMeta,
    updateDetails,
  }
})
export const { focused, setFocused, useOwnerFocusedSelector, focusedMeta, updateDetails } = exports
