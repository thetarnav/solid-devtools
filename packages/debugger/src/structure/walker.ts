import type { ComponentRegisterHandler } from '../main/componentRegistry'
import { NodeType, TreeWalkerMode } from '../main/constants'
import { getOwnerId, getSdtId } from '../main/id'
import { Mapped, NodeID, Solid } from '../main/types'
import { observeComputationUpdate } from '../main/update'
import {
  getComponentRefreshNode,
  markOwnerName,
  markOwnerType,
  resolveElements,
} from '../main/utils'

export type ComputationUpdateHandler = (
  rootId: NodeID,
  owner: Solid.Owner,
  changedStructure: boolean,
) => void

// Globals set before each walker cycle
let Mode: TreeWalkerMode
let RootId: NodeID
let OnComputationUpdate: ComputationUpdateHandler
let RegisterComponent: ComponentRegisterHandler

const ElementsMap = new Map<Mapped.Owner, { el: HTMLElement; component: Mapped.Owner }>()

const $WALKER = Symbol('tree-walker')

function observeComputation(owner: Solid.Computation, attachedData: Solid.Owner): void {
  // leaf nodes (ones that don't have children) don't have to cause a structure update
  // Unless the walker is in DOM mode, then we need to observe all computations
  // This is because DOM can change without the owner structure changing
  let isLeaf = !owner.owned || owner.owned.length === 0
  const boundHandler = OnComputationUpdate.bind(void 0, RootId, attachedData)
  const handler =
    isLeaf && Mode !== TreeWalkerMode.DOM
      ? () => {
          if (isLeaf && (!owner.owned || owner.owned.length === 0)) {
            boundHandler(false)
          } else {
            isLeaf = false
            boundHandler(true)
          }
        }
      : boundHandler.bind(void 0, true)

  observeComputationUpdate(owner, handler, $WALKER)
}

function mapChildren(owner: Solid.Owner, mappedOwner: Mapped.Owner | null): Mapped.Owner[] {
  const children: Mapped.Owner[] = []

  const rawChildren: Solid.Owner[] = owner.owned ? owner.owned.slice() : []
  if (owner.sdtSubRoots) rawChildren.push.apply(rawChildren, owner.sdtSubRoots)

  if (Mode === TreeWalkerMode.Owners) {
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

let MappedOwnerNode: Mapped.Owner
let AddedToParentElements = false

/**
 * @param els elements to map
 * @param parentChildren parent owner children.
 * Will be checked for existing elements, and if found, `MappedOwnerNode` will be injected in the place of the element.
 * Passing `undefined` will skip this check.
 */
function mapElements(
  els: Iterable<Element>,
  parentChildren: Mapped.Owner[] | undefined,
): Mapped.Owner[] {
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
          const elNode = elNodes[i]!
          const elNodeData = ElementsMap.get(elNode)!
          if (elNodeData && elNodeData.el === el) {
            if (AddedToParentElements) {
              // if the element is already added to the parent, just remove the element
              elNodes.splice(i, 1)
            } else {
              // otherwise, we can just replace it with the component
              elNodes[i] = MappedOwnerNode
              AddedToParentElements = true
            }
            r.push(elNode)
            elNodeData.component = MappedOwnerNode
            continue els
          }
          if (elNode.children && elNode.children.length) toCheck.push(elNode.children)
        }
        elNodes = toCheck[index++]
      }
    }

    const mappedEl: Mapped.Owner = {
      id: getSdtId(el),
      type: NodeType.Element,
      name: el.localName,
      children: [],
    }
    r.push(mappedEl)
    ElementsMap.set(mappedEl, { el, component: MappedOwnerNode })

    if (el.children.length) mappedEl.children = mapElements(el.children, parentChildren)
  }

  return r
}

function mapOwner(
  owner: Solid.Owner,
  parent: Mapped.Owner | null,
  overwriteType?: NodeType,
): Mapped.Owner | undefined {
  const id = getOwnerId(owner)
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
      markOwnerType((contextNode = owner.owned[0]!)) === NodeType.Context
    ) {
      // custom mapping for context nodes
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const mapped = mapOwner(contextNode.owned![0]!, parent, NodeType.Context)
      if (mapped) mapped.id = getOwnerId(contextNode)
      return mapped
    }

    // Register component to global map
    RegisterComponent({
      owner: owner as Solid.Component,
      id,
      name: name!,
      elements: (resolvedElements = resolveElements(owner.value)),
    })

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

  AddedToParentElements = false
  MappedOwnerNode = mapped

  // Map html elements in DOM mode
  // elements might already be resolved when mapping components
  if (
    Mode === TreeWalkerMode.DOM &&
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

  // global `AddedToParentElements` will be changed in mapChildren
  const addedToParent = AddedToParentElements

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
  Mode = config.mode
  RootId = config.rootId
  OnComputationUpdate = config.onComputationUpdate
  RegisterComponent = config.registerComponent

  const r = mapOwner(owner, null)!

  if (Mode === TreeWalkerMode.DOM) {
    // Register all mapped element nodes to their components
    for (const [elNode, { el, component }] of ElementsMap) {
      RegisterComponent({
        element: el,
        componentId: component.id,
        elementId: elNode.id,
      })
    }

    ElementsMap.clear()
  }

  // clear the globals
  Mode = RootId = OnComputationUpdate = RegisterComponent = undefined!

  return r
}
