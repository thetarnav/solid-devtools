import { NodeID, Solid } from './types'
import { onOwnerCleanup } from './utils'

const $CLEANUP = Symbol('component-registry-cleanup')

type ComponentData = {
  id: NodeID
  owner: Solid.Component
  name: string
  elements: Set<HTMLElement>
  elementNodes: Set<NodeID>
  cleanup: VoidFunction
}

// Map of component nodes
const ComponentMap = new Map<NodeID, ComponentData>()

// Map of element nodes to component nodes
const ElementNodeMap = new Map<NodeID, { el: HTMLElement; component: ComponentData }>()

function cleanupComponent(nodeID: NodeID) {
  const component = ComponentMap.get(nodeID)
  if (!component) return
  component.cleanup()
  ComponentMap.delete(nodeID)
  for (const element of component.elementNodes) ElementNodeMap.delete(element)
}

export type ComponentRegisterHandler = typeof registerComponent

// used in walker to register component nodes
export function registerComponent(
  data:
    | {
        owner: Solid.Component
        id: NodeID
        name: string
        elements: HTMLElement[] | null
      }
    | {
        componentId: NodeID
        elementId: NodeID
        element: HTMLElement
      },
): void {
  // Add new element node to existing component node
  if ('elementId' in data) {
    const { componentId, elementId, element } = data
    const component = ComponentMap.get(componentId)
    if (!component) return

    component.elementNodes.add(elementId)
    ElementNodeMap.set(elementId, { el: element, component })
  }
  // Add new component node
  else {
    const { owner, id, name, elements: elementsList } = data
    if (!elementsList) return cleanupComponent(id)

    const set = new Set(elementsList)

    const existing = ComponentMap.get(id)
    if (existing) {
      existing.elements = set
      return
    }

    const cleanup = onOwnerCleanup(owner, () => cleanupComponent(id), false, $CLEANUP)

    ComponentMap.set(id, {
      id,
      owner,
      name,
      elements: set,
      cleanup,
      elementNodes: new Set(),
    })
  }
}

export function clearComponentRegistry() {
  for (const component of ComponentMap.values()) component.cleanup()
  ComponentMap.clear()
  ElementNodeMap.clear()
}

export function getComponent(
  id: NodeID,
): { name: string; id: NodeID; elements: HTMLElement[] } | null {
  // provided if might be of an element node (in DOM mode) or component node
  // both need to be checked

  const component = ComponentMap.get(id)
  if (component) return { name: component.name, elements: [...component.elements], id }

  const elData = ElementNodeMap.get(id)
  return elData
    ? { name: elData.component.name, id: elData.component.id, elements: [elData.el] }
    : null
}

/**
 * Searches for an HTML element with the given id in the component with the given id.
 *
 * It is assumed that the element is a child of the component.
 *
 * Used only in the DOM walker mode.
 */
export function getComponentElement(
  elementId: NodeID,
): { name: string; id: NodeID; element: HTMLElement } | undefined {
  const elData = ElementNodeMap.get(elementId)
  return elData && { name: elData.component.name, id: elData.component.id, element: elData.el }
}

// TODO could use some optimization (caching)
export function findComponent(el: HTMLElement): { name: string; id: NodeID } | null {
  const including = new Map<Solid.Owner, ComponentData>()

  let currEl: HTMLElement | null = el
  while (currEl) {
    for (const component of ComponentMap.values()) {
      if (component.elements.has(currEl)) including.set(component.owner, component)
    }
    currEl = including.size === 0 ? currEl.parentElement : null
  }

  if (including.size > 1) {
    // find the closest component
    for (const owner of including.keys()) {
      if (!including.has(owner)) continue
      let currOwner = owner.owner
      while (currOwner) {
        const deleted = including.delete(currOwner)
        if (deleted) break
        currOwner = currOwner.owner
      }
    }
  }

  if (including.size === 0) return null
  const { name, id } = including.values().next().value
  return { name, id }
}
