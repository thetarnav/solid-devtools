import type { ComponentRegisterHandler } from './componentRegistry'
import { NodeType, TreeWalkerMode } from './constants'
import { Mapped, NodeID, Solid } from './types'
import { interceptComputationRerun } from './update'
import {
  getComponentRefreshNode,
  isSolidRoot,
  markNodeID,
  markOwnerName,
  markOwnerType,
  resolveElements,
} from './utils'

export type ComputationUpdateHandler = (
  rootId: NodeID,
  owner: Solid.Owner,
  changedStructure: boolean,
) => void

// Globals set before each walker cycle
let $_mode: TreeWalkerMode
let $_root_id: NodeID
let $_on_computation_update: ComputationUpdateHandler
let $_register_component: ComponentRegisterHandler

const $_elements_map = new Map<Mapped.Owner, HTMLElement>()

function observeComputation(owner: Solid.Computation, attachedData: Solid.Owner): void {
  // leaf nodes (ones that don't have children) don't have to cause a structure update
  // Unless the walker is in DOM mode, then we need to observe all computations
  // This is because DOM can change without the owner structure changing
  let isLeaf = !owner.owned || owner.owned.length === 0
  const boundHandler = $_on_computation_update.bind(void 0, $_root_id, attachedData)
  const handler =
    isLeaf && $_mode !== TreeWalkerMode.DOM
      ? () => {
          if (isLeaf && (!owner.owned || owner.owned.length === 0)) {
            boundHandler(false)
          } else {
            isLeaf = false
            boundHandler(true)
          }
        }
      : boundHandler.bind(void 0, true)

  // owner already patched
  if (owner.onComputationUpdate) return void (owner.onComputationUpdate = handler)
  // patch owner
  owner.onComputationUpdate = handler
  interceptComputationRerun(owner, fn => {
    fn()
    owner.onComputationUpdate!()
  })
}

function mapChildren(owner: Solid.Owner, mappedOwner: Mapped.Owner | null): Mapped.Owner[] {
  const children: Mapped.Owner[] = []

  const rawChildren: Solid.Owner[] = owner.owned ? owner.owned.slice() : []
  if (owner.sdtSubRoots) rawChildren.push.apply(rawChildren, owner.sdtSubRoots)

  if ($_mode === TreeWalkerMode.Owners) {
    for (const child of rawChildren) {
      const mappedChild = mapOwner(child, mappedOwner)
      if (mappedChild) children.push(mappedChild)
    }
  } else {
    for (const child of rawChildren) {
      const type = markOwnerType(child)
      if (type === NodeType.Component) {
        const mappedChild = mapOwner(child, mappedOwner)
        if (mappedChild) children.push(mappedChild)
      } else {
        if (type !== NodeType.Context && type !== NodeType.Root)
          observeComputation(child as Solid.Computation, owner)
        children.push.apply(children, mapChildren(child, mappedOwner))
      }
    }
  }

  return children
}

let $_mapped_owner_node: Mapped.Owner
let $_added_to_parent_elements = false

/**
 * @param els elements to map
 * @param parentChildren parent owner children.
 * Will be checked for existing elements, and if found, `$_mapped_owner_node` will be injected in the place of the element.
 * Passing `undefined` will skip this check.
 */
function mapElements(els: Element[], parentChildren: Mapped.Owner[] | undefined): Mapped.Owner[] {
  const r = [] as Mapped.Owner[]

  els: for (const el of els) {
    if (!(el instanceof HTMLElement)) continue

    if (parentChildren) {
      // find el in parent els and remove it
      const toCheck = [parentChildren]
      let index = 0
      let elNodes = toCheck[index++]
      while (elNodes) {
        for (let i = 0; i < elNodes.length; i++) {
          const elNode = elNodes[i]
          if ($_elements_map.get(elNode) === el) {
            const mappedEl = $_added_to_parent_elements
              ? elNodes.splice(i, 1)[0]
              : elNodes.splice(i, 1, $_mapped_owner_node)[0]
            $_added_to_parent_elements = true
            r.push(mappedEl)
            $_elements_map.set(mappedEl, el)
            continue els
          }
          if (elNode.children && elNode.children.length) toCheck.push(elNode.children)
        }
        elNodes = toCheck[index++]
      }
    }

    const mappedEl: Mapped.Owner = {
      id: markNodeID(el),
      type: NodeType.Element,
      name: el.localName,
      children: [],
    }
    r.push(mappedEl)
    $_elements_map.set(mappedEl, el)

    if (el.children.length) mappedEl.children = mapElements(Array.from(el.children), parentChildren)
  }

  return r
}

function mapOwner(
  owner: Solid.Owner,
  parent: Mapped.Owner | null,
  overwriteType?: NodeType,
): Mapped.Owner | undefined {
  const id = markNodeID(owner)
  const type = overwriteType ?? markOwnerType(owner)
  const name =
    type === NodeType.Component ||
    type === NodeType.Memo ||
    type === NodeType.Effect ||
    type === NodeType.Computation
      ? markOwnerName(owner)
      : undefined

  const mapped = { id, type } as Mapped.Owner
  if (name) mapped.name = name

  let resolvedElements: ReturnType<typeof resolveElements> | undefined

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
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const mapped = mapOwner(contextNode.owned![0], parent, NodeType.Context)
      if (mapped) mapped.id = markNodeID(contextNode)
      return mapped
    }

    // Register component to global map
    $_register_component(
      owner as Solid.Component,
      id,
      name!,
      (resolvedElements = resolveElements(owner.value)),
    )

    // Refresh
    // omitting refresh memo — map it's children instead
    const refresh = getComponentRefreshNode(owner as Solid.Component)
    if (refresh) {
      mapped.hmr = true
      owner = refresh
    }
  }
  // Computation
  else if (type !== NodeType.Context && type !== NodeType.Root) {
    observeComputation(owner as Solid.Computation, owner)
    if (!owner.sources || owner.sources.length === 0) mapped.frozen = true
  }

  const children: Mapped.Owner[] = []
  mapped.children = children

  $_added_to_parent_elements = false
  $_mapped_owner_node = mapped

  // Map html elements in DOM mode
  // elements might already be resolved when mapping components
  if (
    $_mode === TreeWalkerMode.DOM &&
    (resolvedElements =
      resolvedElements === undefined ? resolveElements(owner.value) : resolvedElements)
  ) {
    children.push.apply(
      children,
      mapElements(
        Array.isArray(resolvedElements) ? resolvedElements : [resolvedElements],
        parent?.children,
      ),
    )
  }

  // global $_added_to_parent_elements will be changed in mapChildren
  const addedToParent = $_added_to_parent_elements

  children.push.apply(children, mapChildren(owner, mapped))

  return addedToParent ? undefined : mapped
}

export function walkSolidTree(
  owner: Solid.Owner | Solid.Root,
  config: {
    mode: TreeWalkerMode
    rootId: NodeID
    onComputationUpdate: ComputationUpdateHandler
    registerComponent: ComponentRegisterHandler
  },
): Mapped.Owner {
  // set the globals to be available for this walk cycle
  $_elements_map.clear()
  $_mode = config.mode
  $_root_id = config.rootId
  $_on_computation_update = config.onComputationUpdate
  $_register_component = config.registerComponent

  return mapOwner(owner, null)!
}

/**
 * Finds the top-level root owner of a given owner.
 */
export function getTopRoot(owner: Solid.Owner): Solid.Root | null {
  let root: Solid.Root | null = null
  while (owner) {
    if (isSolidRoot(owner)) root = owner
    owner = owner.owner!
  }
  return root
}

/**
 * Finds the closest owner of a given owner that is included in the tree walker.
 */
export function getClosestIncludedOwner(
  owner: Solid.Owner,
  mode: TreeWalkerMode,
): Solid.Owner | null {
  if (mode === TreeWalkerMode.Owners) return owner
  let root: Solid.Owner | null = null
  do {
    const type = markOwnerType(owner)
    if (type === NodeType.Component || type === NodeType.Context) return owner
    if (type === NodeType.Root) root = owner
    owner = owner.owner!
  } while (owner)
  return root
}
