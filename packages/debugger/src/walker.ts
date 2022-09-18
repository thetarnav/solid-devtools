import { resolveElements } from "@solid-primitives/refs"
import { NodeType, NodeID, Solid, Mapped } from "@solid-devtools/shared/graph"
import { isSolidComputation, markNodeID, markOwnerName, markOwnerType } from "./utils"
import { observeComputationUpdate } from "./update"

export type ComputationUpdateHandler = (rootId: NodeID, nodeId: NodeID) => void

// Globals set before each walker cycle
let InspectedId: NodeID | null
let RootId: NodeID
let OnComputationUpdate: ComputationUpdateHandler
let GatherComponents: boolean
let Components: Mapped.Component[] = []
let InspectedOwner: Solid.Owner | null

function observeComputation(owner: Solid.Owner, id: NodeID) {
  if (isSolidComputation(owner))
    observeComputationUpdate(owner, OnComputationUpdate.bind(void 0, RootId, id))
}

function mapOwner(owner: Solid.Owner): Mapped.Owner {
  const type = markOwnerType(owner)
  const id = markNodeID(owner)
  const name = markOwnerName(owner)

  if (id === InspectedId) InspectedOwner = owner

  observeComputation(owner, id)

  if (GatherComponents && type === NodeType.Component) {
    const element = resolveElements(owner.value)
    if (element) Components.push({ id, name, element })
  }

  const children = owner.owned ? owner.owned.map(child => mapOwner(child)) : []
  return { id, name, type, children }
  // sources: owner.sources ? owner.sources.length : 0,
}

export type WalkerResult = {
  root: Mapped.Root
  inspectedOwner: Solid.Owner | null
  components: Mapped.Component[]
}

export function walkSolidTree(
  owner: Solid.Root,
  config: {
    rootId: NodeID
    onComputationUpdate: ComputationUpdateHandler
    gatherComponents: boolean
    inspectedId: NodeID | null
  },
): WalkerResult {
  // set the globals to be available for this walk cycle
  InspectedId = config.inspectedId
  RootId = config.rootId
  OnComputationUpdate = config.onComputationUpdate
  GatherComponents = config.gatherComponents
  InspectedOwner = null
  // components is an array instead of an object to preserve the order (nesting) of the components,
  // this helps the locator find the most nested component first
  Components = []

  const root: Mapped.Root = { id: RootId, tree: mapOwner(owner) }

  if (owner.sdtAttachedTo) root.attachedTo = markNodeID(owner.sdtAttachedTo)

  return { root, inspectedOwner: InspectedOwner, components: Components }
}
