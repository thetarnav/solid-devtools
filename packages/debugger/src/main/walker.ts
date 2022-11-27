import {
  getComponentRefreshNode,
  isSolidComponent,
  isSolidMemo,
  markNodeID,
  markOwnerName,
  markOwnerType,
  resolveElements,
} from './utils'
import { observeComputationUpdate } from './update'
import { Mapped, NodeID, Solid } from './types'
import { NodeType, TreeWalkerMode } from './constants'

export type ComputationUpdateHandler = (rootId: NodeID, nodeId: NodeID) => void

// Globals set before each walker cycle
let $mode: TreeWalkerMode
let $rootId: NodeID
let $onComputationUpdate: ComputationUpdateHandler
let $components: Mapped.ResolvedComponent[] = []

function mapChildren(owner: Solid.Owner): Mapped.Owner[] | undefined {
  const { owned } = owner
  if (!owned || !owned.length) return
  const children: Mapped.Owner[] = []
  if ($mode === TreeWalkerMode.Owners) {
    for (const child of owned) children.push(mapOwner(child))
  } else {
    for (const child of owned) {
      const type = markOwnerType(child)
      if (type === NodeType.Component) {
        children.push(mapOwner(child, type))
      } else {
        const childChildren = mapChildren(child)
        childChildren && children.push.apply(children, childChildren)
      }
    }
  }
  return children
}

function mapComputation(owner: Solid.Computation, idToUpdate: NodeID, mapped: Mapped.Owner): void {
  observeComputationUpdate(
    owner as Solid.Computation,
    $onComputationUpdate.bind(void 0, $rootId, idToUpdate),
  )
  if (!owner.sources || owner.sources.length === 0) mapped.frozen = true
}

function mapOwner(owner: Solid.Owner, type = markOwnerType(owner)): Mapped.Owner {
  const id = markNodeID(owner)
  const name =
    type === NodeType.Component ||
    type === NodeType.Memo ||
    type === NodeType.Effect ||
    type === NodeType.Computation
      ? markOwnerName(owner)
      : undefined

  const mapped = { id, type } as Mapped.Owner
  if (name) mapped.name = name

  // Component
  if (type === NodeType.Component) {
    // Context
    // combine context provide component with it' render-effect
    let contextNode: Solid.Computation | undefined
    if (
      name === 'provider' &&
      owner.owned &&
      owner.owned.length === 1 &&
      markOwnerType((contextNode = owner.owned[0])) === NodeType.Context
    ) {
      // custom mapping for context nodes
      const id = markNodeID(contextNode)
      return { id, type: NodeType.Context, children: mapChildren(contextNode.owned![0]) }
    }

    const element = resolveElements(owner.value)
    if (element) $components.push({ id, name: name!, element })

    // <Show> component
    let showMemoCondition: Solid.Memo
    let showMemoNode: Solid.Memo
    if (
      name === 'Show' &&
      owner.owned?.length === 2 &&
      isSolidMemo((showMemoCondition = owner.owned[0] as Solid.Memo)) &&
      isSolidMemo((showMemoNode = owner.owned[1] as Solid.Memo))
    ) {
      showMemoCondition.name = 'condition'
      showMemoNode.name = 'value'
    }

    // <For> component
    let forMemo: Solid.Memo
    if (
      name === 'For' &&
      owner.owned?.length === 1 &&
      isSolidMemo((forMemo = owner.owned[0] as Solid.Memo))
    ) {
      forMemo.name = 'value'
    }

    // Refresh
    // omitting refresh memo — map it's children instead
    let hmr = false
    let refresh = getComponentRefreshNode(owner as Solid.Component)
    if (refresh) {
      hmr = true
      owner = refresh
    }
    mapped.hmr = hmr
  }
  // Computation
  else if (type !== NodeType.Context) mapComputation(owner as Solid.Computation, id, mapped)

  const children = mapChildren(owner)
  if (children) mapped.children = children
  return mapped
}

function mapRoot(root: Solid.Root, id: NodeID): Mapped.Root {
  const { sdtAttached } = root

  const mapped: Mapped.Root = { id, type: NodeType.Root, children: mapChildren(root) }

  if (sdtAttached) {
    if ($mode === TreeWalkerMode.Owners) mapped.attached = markNodeID(sdtAttached)
    // Attach only to components in Components mode
    else {
      let parent: Solid.Owner | null = sdtAttached
      while (parent && !isSolidComponent(parent)) parent = parent.owner
      if (parent) mapped.attached = markNodeID(parent)
    }
  }

  return mapped
}

export type WalkerResult = {
  root: Mapped.Root
  components: Mapped.ResolvedComponent[]
}

export function walkSolidTree(
  owner: Solid.Root,
  config: {
    mode: TreeWalkerMode
    rootId: NodeID
    onComputationUpdate: ComputationUpdateHandler
    gatherComponents?: boolean
  },
): WalkerResult {
  // set the globals to be available for this walk cycle
  $mode = config.mode
  $rootId = config.rootId
  $onComputationUpdate = config.onComputationUpdate
  // components is an array instead of an object to preserve the order (nesting) of the components,
  // this helps the locator find the most nested component first
  $components = []

  const root = mapRoot(owner, $rootId)

  return { root, components: $components }
}
