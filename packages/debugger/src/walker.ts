import { resolveElements } from "@solid-primitives/refs"
import { NodeType, NodeID, Solid, Mapped } from "@solid-devtools/shared/graph"
import { isSolidComputation, markNodeID, markOwnerName, markOwnerType } from "./utils"
import { observeComputationUpdate } from "./update"

export type ComputationUpdateHandler = (rootId: NodeID, nodeId: NodeID) => void

// Globals set before each walker cycle
let $inspectedId: NodeID | null
let $rootId: NodeID
let $onComputationUpdate: ComputationUpdateHandler
let $gatherComponents: boolean
let $components: Mapped.Component[] = []
let $inspectedOwner: Solid.Owner | null

function mapChildren(owner: Solid.Owner): Mapped.Owner[] | undefined {
  const { owned } = owner
  if (!owned || !owned.length) return
  const children: Mapped.Owner[] = Array(owned.length)
  for (let i = 0; i < children.length; i++) children[i] = mapOwner(owned[i])
  return children
}

function mapOwner(owner: Solid.Owner): Mapped.Owner {
  const type = markOwnerType(owner)
  const id = markNodeID(owner)
  const name = markOwnerName(owner)

  const mapped: Mapped.Owner = { id, name, type }
  const { owned } = owner

  if (id === $inspectedId) $inspectedOwner = owner

  if (isSolidComputation(owner))
    observeComputationUpdate(owner, $onComputationUpdate.bind(void 0, $rootId, id))

  if (type === NodeType.Component) {
    if ($gatherComponents) {
      const element = resolveElements(owner.value)
      if (element) $components.push({ id, name, element })
    }
    // omitting refresh memo — map it's children instead
    let refresh: Solid.Owner | undefined
    if (owned && owned.length === 1 && markOwnerType((refresh = owned[0])) === NodeType.Refresh) {
      owner = refresh
      mapped.hmr = true
    }
  }

  const children = mapChildren(owner)
  if (children) mapped.children = children
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
    gatherComponents?: boolean
    inspectedId: NodeID | null
  },
): WalkerResult {
  // set the globals to be available for this walk cycle
  $inspectedId = config.inspectedId
  $rootId = config.rootId
  $onComputationUpdate = config.onComputationUpdate
  $gatherComponents = !!config.gatherComponents
  $inspectedOwner = null
  // components is an array instead of an object to preserve the order (nesting) of the components,
  // this helps the locator find the most nested component first
  $components = []

  const root: Mapped.Root = { id: $rootId, tree: mapOwner(owner) }

  if (owner.sdtAttachedTo) root.attachedTo = markNodeID(owner.sdtAttachedTo)

  return { root, inspectedOwner: $inspectedOwner, components: $components }
}
