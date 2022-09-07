import { Graph, NodeID } from "@solid-devtools/shared/graph"
import { createContext, useContext, Accessor } from "solid-js"
import type { ContextProviderComponent } from "solid-js/types/reactive/signal"

export type StructureContextState = {
  handleFocus: (owner: Graph.Owner | null) => void
  useUpdatedSelector: (id: NodeID) => Accessor<boolean>
  useSelectedSelector: (owner: Graph.Owner) => Accessor<boolean>
  toggleHoveredOwner: (owner: Graph.Owner, hovered: boolean) => void
  useHoveredSelector: (id: NodeID) => Accessor<boolean>
}

const StructureContext = createContext<StructureContextState>()

export const StructureProvider: ContextProviderComponent<StructureContextState | undefined> =
  StructureContext.Provider

export const useStructure = () => {
  const ctx = useContext(StructureContext)
  if (!ctx) throw "GraphContext wasn't provided."
  return ctx
}
