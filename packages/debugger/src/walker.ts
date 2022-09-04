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

function mapChildren({ owned, ownedRoots }: Readonly<Solid.Owner>): Mapped.Owner[] {
  const children: Mapped.Owner[] = []

  if (owned)
    children.push.apply(
      children,
      owned.map(child => mapOwner(child)),
    )

  if (ownedRoots)
    children.push.apply(
      children,
      [...ownedRoots].map(child => mapOwner(child, NodeType.Root)),
    )

  return children
}

function mapOwner(owner: Solid.Owner, type?: NodeType): Mapped.Owner {
  type = markOwnerType(owner, type)
  const id = markNodeID(owner)
  const name = markOwnerName(owner)

  if (id === InspectedId) InspectedOwner = owner

  observeComputation(owner, id)

  if (GatherComponents && type === NodeType.Component) {
    const element = resolveElements(owner.value)
    if (element) Components.push({ id, name, element })
  }

  return {
    id,
    name,
    type,
    children: mapChildren(owner),
    sources: owner.sources ? owner.sources.length : 0,
  }
}

export type WalkerResult = {
  tree: Mapped.Owner
  components: Mapped.Component[]
  inspectedOwner: Solid.Owner | null
}

export function walkSolidTree(
  owner: Solid.Owner,
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
  Components = []

  const tree = mapOwner(owner)
  return { tree, components: Components, inspectedOwner: InspectedOwner }
}
