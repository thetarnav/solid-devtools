import { resolveElements } from "@solid-primitives/refs"
import { NodeType, NodeID, Solid, Mapped } from "@solid-devtools/shared/graph"
import { encodeValue } from "@solid-devtools/shared/serialize"
import {
  getNodeName,
  getNodeType,
  isSolidComputation,
  isSolidMemo,
  markNodeID,
  markNodesID,
  markOwnerName,
  markOwnerType,
} from "./utils"
import { observeComputationUpdate, observeValueUpdate, removeValueUpdateObserver } from "./update"

export type SignalUpdateHandler = (nodeId: NodeID, value: unknown) => void
export type ComputationUpdateHandler = (rootId: NodeID, nodeId: NodeID) => void

// Globals set before each walker cycle
let SelectedId: NodeID | null
let RootId: NodeID
let OnSignalUpdate: SignalUpdateHandler
let OnComputationUpdate: ComputationUpdateHandler
let GatherComponents: boolean
let Components: Record<NodeID, Mapped.Component> = {}
let SelectedOwner: Solid.Owner | null
let SelectedDetails: Mapped.OwnerDetails | null
let SelectedSignalMap: Record<NodeID, Solid.Signal>
let ElementMap: Record<NodeID, HTMLElement>

const WALKER = Symbol("walker")

function observeComputation(owner: Solid.Owner, id: NodeID) {
  if (isSolidComputation(owner))
    observeComputationUpdate(owner, OnComputationUpdate.bind(void 0, RootId, id))
}

function observeValue(node: Solid.Signal) {
  const id = markNodeID(node)
  // OnSignalUpdate will change
  const handler = OnSignalUpdate
  observeValueUpdate(node, value => handler(id, value), WALKER)
}

function mapSignalNode(node: Solid.Signal): Mapped.Signal {
  const id = markNodeID(node)
  SelectedSignalMap[id] = node
  observeValue(node)
  return {
    type: getNodeType(node) as NodeType.Memo | NodeType.Signal,
    name: getNodeName(node),
    id,
    observers: markNodesID(node.observers),
    value: encodeValue(node.value, false, ElementMap),
  }
}

export function clearOwnerObservers(owner: Solid.Owner): void {
  if (owner.sourceMap)
    Object.values(owner.sourceMap).forEach(node => removeValueUpdateObserver(node, WALKER))
  if (owner.owned) owner.owned.forEach(node => removeValueUpdateObserver(node, WALKER))
}

function collectOwnerDetails(owner: Solid.Owner): void {
  // get owner path
  const path: NodeID[] = []
  let current: Solid.Owner | null = owner.owner
  while (current) {
    // * after we flatten the tree, we'll know the length of the path — no need to use unshift then
    path.unshift(markNodeID(current))
    current = current.owner
  }

  // map signals
  const signals = owner.sourceMap ? Object.values(owner.sourceMap).map(mapSignalNode) : []
  // map memos
  owner.owned?.forEach(child => {
    if (!isSolidMemo(child)) return
    signals.push(mapSignalNode(child))
  })

  const details: Mapped.OwnerDetails = {
    // id, name and type are already set in mapOwner
    id: owner.sdtId!,
    name: owner.sdtName!,
    type: owner.sdtType!,
    path,
    signals,
  }

  if (isSolidComputation(owner)) {
    details.value = encodeValue(owner.value, false, ElementMap)
    details.sources = markNodesID(owner.sources)
    if (isSolidMemo(owner)) {
      details.observers = markNodesID(owner.observers)
    }
  }

  SelectedOwner = owner
  SelectedDetails = details
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

  if (id === SelectedId) collectOwnerDetails(owner)

  observeComputation(owner, id)

  if (GatherComponents && type === NodeType.Component) {
    const resolved = resolveElements(owner.value)
    if (resolved) Components[id] = { name, resolved }
  }

  return {
    id,
    name,
    type,
    children: mapChildren(owner),
    sources: owner.sources ? owner.sources.length : 0,
  }
}

export type WalkerConfig = {
  rootId: NodeID
  onSignalUpdate: SignalUpdateHandler
  onComputationUpdate: ComputationUpdateHandler
  gatherComponents: boolean
  selectedId: NodeID | null
  elementMap?: Record<NodeID, HTMLElement>
}

export type WalkerSelectedResult = (
  | { details: Mapped.OwnerDetails; owner: Solid.Owner }
  | { details: null; owner: null }
) & {
  signalMap: Record<NodeID, Solid.Signal>
  elementMap: Record<NodeID, HTMLElement>
}

export function walkSolidTree(
  owner: Solid.Owner,
  config: WalkerConfig,
): {
  tree: Mapped.Owner
  components: Record<NodeID, Mapped.Component>
  selected: WalkerSelectedResult
} {
  // set the globals to be available for this walk cycle
  SelectedId = config.selectedId
  RootId = config.rootId
  OnSignalUpdate = config.onSignalUpdate
  OnComputationUpdate = config.onComputationUpdate
  GatherComponents = config.gatherComponents
  SelectedOwner = null
  SelectedDetails = null
  SelectedSignalMap = {}
  Components = {}
  ElementMap = config.elementMap ?? {}

  const tree = mapOwner(owner)
  const components = Components
  const focusedOwner = SelectedOwner
  const focusedOwnerDetails = SelectedDetails
  const focusedOwnerSignalMap = SelectedSignalMap
  const elementMap = ElementMap

  return {
    tree,
    components,
    selected: {
      details: focusedOwnerDetails,
      owner: focusedOwner,
      signalMap: focusedOwnerSignalMap,
      elementMap,
    },
  }
}
