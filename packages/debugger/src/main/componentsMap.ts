import { NodeID, Solid } from './types'
import { onOwnerCleanup } from './utils'

const $CLEANUP = Symbol('components-map')

export type ComponentRegisterHandler = (
  owner: Solid.Component,
  nodeID: NodeID,
  name: string,
  elements: HTMLElement[] | null,
) => void

export type ComponentsMap = {
  register: ComponentRegisterHandler
  clear: VoidFunction
  getComponent: (nodeID: NodeID) => { name: string; elements: HTMLElement[] } | null
  findComponent: (el: HTMLElement) => { name: string; id: NodeID } | null
}

export function createComponentsMap() {
  type ComponentData = {
    id: NodeID
    owner: Solid.Component
    name: string
    elements: Set<HTMLElement>
    cleanup: VoidFunction
  }

  const map = new Map<NodeID, ComponentData>()

  const removeComponent = (nodeID: NodeID) => {
    const component = map.get(nodeID)
    if (!component) return
    component.cleanup()
    map.delete(nodeID)
  }

  const register: ComponentRegisterHandler = (owner, nodeId, name, elements) => {
    if (!elements) return removeComponent(nodeId)

    const set = new Set(elements)

    const existing = map.get(nodeId)
    if (existing) return (existing.elements = set)

    const cleanup = onOwnerCleanup(owner, () => removeComponent(nodeId), false, $CLEANUP)

    map.set(nodeId, { id: nodeId, owner, name, elements: set, cleanup })
  }

  const clear = () => {}

  const getComponent: ComponentsMap['getComponent'] = nodeID => {
    const component = map.get(nodeID)
    return component ? { name: component.name, elements: [...component.elements] } : null
  }

  // TODO could use some optimization (caching)
  const findComponent: ComponentsMap['findComponent'] = el => {
    const including = new Map<Solid.Owner, ComponentData>()

    let current: HTMLElement | null = el
    while (current) {
      for (const component of map.values()) {
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

  return {
    register,
    clear,
    getComponent,
    findComponent,
  }
}
