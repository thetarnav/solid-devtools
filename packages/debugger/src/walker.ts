import { resolveElements } from "@solid-primitives/refs"
import {
  MappedOwner,
  NodeType,
  SolidOwner,
  MappedSignal,
  SolidSignal,
  MappedComponent,
  SignalState,
  SolidMemo,
  OwnerDetails,
} from "@solid-devtools/shared/graph"
import { ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import {
  getSafeValue,
  isSolidComputation,
  markNodeID,
  markNodesID,
  markOwnerName,
  markOwnerType,
} from "./utils"
import { observeComputationUpdate, observeValueUpdate, removeValueUpdateObserver } from "./update"

// Globals set before each walker cycle
let FocusedID: number | null = null
let RootID: number
let OnSignalUpdate: SignalUpdateHandler
let OnComputationUpdate: ComputationUpdateHandler
let ObserveComputations: boolean
let GatherComponents: boolean
let Components: MappedComponent[] = []
let FocusedOwner: SolidOwner | null = null
let FocusedOwnerDetails: OwnerDetails | null = null

const WALKER = Symbol("walker")

function observeComputation(owner: SolidOwner, id: number) {
  if (ObserveComputations && isSolidComputation(owner))
    observeComputationUpdate(owner, OnComputationUpdate.bind(void 0, id))
}

function observeValue(node: SignalState, id: number) {
  // OnSignalUpdate will change
  const handler = OnSignalUpdate
  observeValueUpdate(node, (value, oldValue) => handler({ id, value, oldValue }), WALKER)
}

function createSignalNode(
  raw: Pick<SolidSignal, "name" | "value" | "observers"> & { id: number },
): MappedSignal {
  return {
    name: raw.name ?? "(anonymous)",
    id: raw.id,
    observers: markNodesID(raw.observers),
    value: getSafeValue(raw.value),
  }
}

function mapOwnerSignals(owner: SolidOwner): MappedSignal[] {
  if (!owner.sourceMap) return []
  return Object.values(owner.sourceMap).map(raw => {
    const id = markNodeID(raw)
    observeValue(raw, id)
    return createSignalNode({ ...raw, id })
  })
}

export function clearOwnerSignalsObservers(owner: SolidOwner): void {
  if (!owner.sourceMap) return
  Object.values(owner.sourceMap).forEach(node => removeValueUpdateObserver(node, WALKER))
}

function mapChildren({ owned, ownedRoots }: Readonly<SolidOwner>): MappedOwner[] {
  const children: MappedOwner[] = []

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

// ? is this neccessary to be a part of the walked tree?
function mapMemo(mapped: MappedOwner, owner: SolidMemo): MappedOwner {
  const { id, name } = mapped
  // observeValue(owner, id)
  return Object.assign(mapped, {
    signal: createSignalNode({ id, name, value: owner.value, observers: owner.observers }),
  })
}

function mapOwner(owner: SolidOwner, type?: NodeType): MappedOwner {
  type = markOwnerType(owner, type)
  const id = markNodeID(owner)
  const name = markOwnerName(owner)

  if (id === FocusedID) {
    FocusedOwner = owner
    FocusedOwnerDetails = mapOwnerDetails(owner)
  }

  observeComputation(owner, id)

  if (type === NodeType.Component && GatherComponents) {
    const resolved = resolveElements(owner.value)
    if (resolved) Components.push({ name, resolved })
  }

  const mapped = {
    id,
    name,
    type,
    children: mapChildren(owner),
    sources: markNodesID(owner.sources),
  }

  return type === NodeType.Memo ? mapMemo(mapped, owner as SolidMemo) : mapped
}

function mapOwnerDetails(owner: SolidOwner): OwnerDetails | null {
  const type = owner.sdtType!
  const id = owner.sdtId!
  const name = owner.sdtName!
  const signals = mapOwnerSignals(owner)

  return {
    id,
    name,
    type,
    // TODO:
    path: [],
    signals,
  }
}

export type WalkerConfig = {
  rootId: number
  onSignalUpdate: SignalUpdateHandler
  onComputationUpdate: ComputationUpdateHandler
  observeComputations: boolean
  gatherComponents: boolean
  focusedID: number | null
}

export function walkSolidTree(
  owner: SolidOwner,
  config: WalkerConfig,
): {
  tree: MappedOwner
  components: MappedComponent[]
  focusedOwnerDetails: OwnerDetails | null
  focusedOwner: SolidOwner | null
} {
  // set the globals to be available for this walk cycle
  FocusedID = config.focusedID
  RootID = config.rootId
  OnSignalUpdate = config.onSignalUpdate
  OnComputationUpdate = config.onComputationUpdate
  ObserveComputations = config.observeComputations
  GatherComponents = config.gatherComponents
  if (GatherComponents) Components = []

  const tree = mapOwner(owner)
  const components = Components
  const focusedOwner = FocusedOwner
  const focusedOwnerDetails = FocusedOwnerDetails

  return { tree, components, focusedOwner, focusedOwnerDetails }
}
