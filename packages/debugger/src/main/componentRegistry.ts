import { whileArray } from '@solid-devtools/shared/utils'
import { NodeID, Solid } from './types'
import { markNodeID, onOwnerCleanup } from './utils'

const $CLEANUP = Symbol('component-registry-cleanup')

type ComponentData = {
  id: NodeID
  owner: Solid.Component
  name: string
  elements: Set<HTMLElement>
  cleanup: VoidFunction
}

const ComponentMap = new Map<NodeID, ComponentData>()

const removeComponent = (nodeID: NodeID) => {
  const component = ComponentMap.get(nodeID)
  if (!component) return
  component.cleanup()
  ComponentMap.delete(nodeID)
}

export type ComponentRegisterHandler = typeof registerComponent

// used in walker to register component nodes
export const registerComponent = (
  owner: Solid.Component,
  nodeId: NodeID,
  name: string,
  elements: HTMLElement[] | null,
): void => {
  if (!elements) return removeComponent(nodeId)

  const set = new Set(elements)

  const existing = ComponentMap.get(nodeId)
  if (existing) {
    existing.elements = set
    return
  }

  const cleanup = onOwnerCleanup(owner, () => removeComponent(nodeId), false, $CLEANUP)

  ComponentMap.set(nodeId, { id: nodeId, owner, name, elements: set, cleanup })
}

export function clearComponentRegistry() {
  for (const component of ComponentMap.values()) component.cleanup()
  ComponentMap.clear()
}

export function getComponent(nodeId: NodeID): { name: string; elements: HTMLElement[] } | null {
  const component = ComponentMap.get(nodeId)
  return component ? { name: component.name, elements: [...component.elements] } : null
}

/**
 * Searches for an HTML element with the given id in the component with the given id.
 *
 * It is assumed that the element is a child of the component.
 *
 * Used only in the DOM walker mode.
 */
export function findComponentElement(
  nodeId: NodeID,
  elementId: NodeID,
): { name: string; id: NodeID; element: HTMLElement } | undefined {
  const component = ComponentMap.get(nodeId)
  if (!component) return

  return whileArray([...component.elements], (el, toCheck) => {
    if (markNodeID(el) === elementId) return { name: component.name, id: nodeId, element: el }
    for (const child of el.children) child instanceof HTMLElement && toCheck.push(child)
  })
}

// TODO could use some optimization (caching)
export function findComponent(el: HTMLElement): { name: string; id: NodeID } | null {
  const including = new Map<Solid.Owner, ComponentData>()

  let current: HTMLElement | null = el
  while (current) {
    for (const component of ComponentMap.values()) {
      if (component.elements.has(current)) including.set(component.owner, component)
    }
    current = including.size === 0 ? current.parentElement : null
  }

  if (including.size > 1) {
    // find the closest component
    for (const owner of including.keys()) {
      if (!including.has(owner)) continue
      let current = owner.owner
      while (current) {
        const deleted = including.delete(current)
        if (deleted) break
        current = current.owner
      }
    }
  }

  if (including.size === 0) return null
  const { name, id } = including.values().next().value
  return { name, id }
}
