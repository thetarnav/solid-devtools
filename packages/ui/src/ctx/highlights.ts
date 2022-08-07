import { GraphOwner, GraphSignal } from "@solid-devtools/shared/graph"
import { createContext, useContext } from "solid-js"
import type { ContextProviderComponent } from "solid-js/types/reactive/signal"

export type HighlightContextState = {
  highlightSignalObservers: (signal: GraphSignal, highlight: boolean) => void
  highlightNodeSources: (owner: GraphOwner, highlight: boolean) => void
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
