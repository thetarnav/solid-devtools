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

function mapOwner(owner: Solid.Owner): Mapped.Owner {
  const type = markOwnerType(owner)
  const id = markNodeID(owner)
  const name = markOwnerName(owner)

  if (id === InspectedId) InspectedOwner = owner

  if (isSolidComputation(owner))
    observeComputationUpdate(owner, OnComputationUpdate.bind(void 0, RootId, id))

  if (GatherComponents && type === NodeType.Component) {
    const element = resolveElements(owner.value)
    if (element) Components.push({ id, name, element })
  }

  const mapped: Mapped.Owner = { id, name, type }

  const { owned } = owner
  if (owned) {
    const children: Mapped.Owner[] = Array(owned.length)
    for (let i = 0; i < children.length; i++) children[i] = mapOwner(owned[i])
    mapped.children = children
  }

  return mapped
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
