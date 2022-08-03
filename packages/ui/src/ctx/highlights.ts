import { GraphOwner, GraphSignal } from "@shared/graph"
import { createContext, useContext } from "solid-js"
import type { ContextProviderComponent } from "solid-js/types/reactive/signal"

export type HighlightContextState = {
  highlightObserversOf: (signal: GraphSignal) => void
  cancelHightlightObserversOf: (signal: GraphSignal) => void
  highlightSourcesOf: (owner: GraphOwner) => void
  cancelHightlightSourcesOf: (owner: GraphOwner) => void
  isObserverHighlighted: (owner: GraphOwner) => boolean
  isSourceHighlighted: (signal: GraphSignal) => boolean
}

const HighlightsContext = createContext<HighlightContextState>()

export const HighlightsProvider: ContextProviderComponent<HighlightContextState | undefined> =
  HighlightsContext.Provider
export const useHighlights = () => {
  const ctx = useContext(HighlightsContext)
  if (!ctx) throw "GraphContext wasn't provided."
  return ctx
}
