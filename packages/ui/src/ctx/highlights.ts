import { Graph, NodeID } from "@solid-devtools/shared/graph"
import { createContext, useContext } from "solid-js"
import type { Accessor, ContextProviderComponent } from "solid-js/types/reactive/signal"

export type HighlightContextState = {
  highlightSignalObservers: (signal: Graph.Signal, highlight: boolean) => void
  highlightNodeSources: (owner: Graph.Owner, highlight: boolean) => void
  handleFocus: (owner: Graph.Owner | null) => void
  isObserverHighlighted: (owner: Graph.Owner) => boolean
  isSourceHighlighted: (signal: Graph.Signal) => boolean
  useOwnerFocusedSelector: (owner: Graph.Owner) => Accessor<boolean>
  useComputationUpdatedSelector: (id: NodeID) => Accessor<boolean>
}

const HighlightsContext = createContext<HighlightContextState>()

export const HighlightsProvider: ContextProviderComponent<HighlightContextState | undefined> =
  HighlightsContext.Provider
export const useHighlights = () => {
  const ctx = useContext(HighlightsContext)
  if (!ctx) throw "GraphContext wasn't provided."
  return ctx
}
