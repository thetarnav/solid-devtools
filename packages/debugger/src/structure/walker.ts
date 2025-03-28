import {untrackedCallback} from '@solid-devtools/shared/primitives'
import {ObjectType, getSdtId} from '../main/id.ts'
import {observeComputationUpdate} from '../main/observe.ts'
import {
    type ElementInterface,
    type Mapped,
    type NodeID,
    type Solid,
    NodeType,
    TreeWalkerMode,
} from '../main/types.ts'
import {
    getComponentRefreshNode,
    getNodeName,
    isSolidComputation,
    markOwnerType,
    onOwnerCleanup,
    owner_each_child,
    unwrap_append,
} from '../main/utils.ts'

export
type ComponentData<TEl extends object> = {
    id:            NodeID,
    owner:         Solid.Component,
    name:          string | undefined,
    elements:      Set<TEl>,
    element_nodes: Set<NodeID>,
    cleanup:       () => void,
}

export
type ComponentRegistry<TEl extends object> = {
    eli:           ElementInterface<TEl>,
    /** Map of component nodes */
    components:    Map<NodeID, ComponentData<TEl>>,
    /** Map of element nodes to component nodes */
    element_nodes: Map<NodeID, {el: HTMLElement; component: ComponentData<TEl>}>,
}

export
const makeComponentRegistry = <TEl extends object>(
    eli: ElementInterface<TEl>,
): ComponentRegistry<TEl> => {
    return {
        eli:           eli,
        components:    new Map,
        element_nodes: new Map,
    }
}

export
const clearComponentRegistry = <TEl extends object>(
    r: ComponentRegistry<TEl>,
) => {
    for (let component of r.components.values()) component.cleanup()
    r.components.clear()
    r.element_nodes.clear()
}

export
const cleanupComponent = <TEl extends object>(
    r:      ComponentRegistry<TEl>,
    nodeID: NodeID,
) => {
    let component = r.components.get(nodeID)
    if (component != null) {
        component.cleanup()
        r.components.delete(nodeID)
        for (let element of component.element_nodes) {
            r.element_nodes.delete(element)
        }
    }
}

const $CLEANUP = Symbol('component-registry-cleanup')

export
const registerComponent = <TEl extends object>(
    r:        ComponentRegistry<TEl>,
    owner:    Solid.Component,
    id:       NodeID,
    name:     string | undefined,
    elements: TEl[] | null,
): void => {
    // Handle cleanup if elements is null
    if (elements == null) {
        cleanupComponent(r, id)
        return
    }

    let set = new Set(elements)

    let existing = r.components.get(id)
    if (existing != null) {
        existing.elements = set
        return
    }

    let cleanup = onOwnerCleanup(owner, () => cleanupComponent(r, id), false, $CLEANUP)

    r.components.set(id, {
        id:            id,
        owner:         owner,
        name:          name,
        elements:      set,
        element_nodes: new Set(),
        cleanup:       cleanup,
    })
}

export
const registerElement = <TEl extends object>(
    r: ComponentRegistry<TEl>,
    componentId: NodeID,
    elementId: NodeID,
    element: TEl,
): void => {
    let component = r.components.get(componentId)
    if (!component) return

    component.element_nodes.add(elementId)
    r.element_nodes.set(elementId, {el: element as unknown as HTMLElement, component})
}

export
const getComponent = <TEl extends object>(
    r: ComponentRegistry<TEl>,
    id: NodeID,
): {name: string | undefined; id: NodeID; elements: HTMLElement[]} | null => {
    // provided if might be of an element node (in DOM mode) or component node
    // both need to be checked

    let component = r.components.get(id)
    if (component) return {
        name: component.name,
        elements: [...component.elements].map(el => el as unknown as HTMLElement),
        id
    }

    let elData = r.element_nodes.get(id)
    return elData
        ? {name: elData.component.name, id: elData.component.id, elements: [elData.el]}
        : null
}

/**
 * Searches for an HTML element with the given id in the component with the given id.
 *
 * It is assumed that the element is a child of the component.
 *
 * Used only in the DOM walker mode.
 */
export
const getComponentElement = <TEl extends object>(
    r: ComponentRegistry<TEl>,
    elementId: NodeID,
): {name: string | undefined; id: NodeID; element: HTMLElement} | undefined => {
    let el_data = r.element_nodes.get(elementId)
    if (el_data != null) {
        return {name: el_data.component.name, id: el_data.component.id, element: el_data.el}
    }
}

export
const findComponent = <TEl extends object>(
    r: ComponentRegistry<TEl>,
    el: HTMLElement
): {name: string; id: NodeID} | null => {

    let including = new Map<Solid.Owner, ComponentData<TEl>>()

    let currEl: HTMLElement | null = el
    while (currEl) {
        for (let component of r.components.values()) {
            if ([...component.elements].some(e => e === currEl || e === currEl as unknown as TEl)) {
                including.set(component.owner, component)
            }
        }
        currEl = including.size === 0 ? currEl.parentElement : null
    }

    if (including.size > 1) {
        // find the closest component
        for (let owner of including.keys()) {
            if (!including.has(owner)) continue
            let currOwner = owner.owner
            while (currOwner) {
                let deleted = including.delete(currOwner)
                if (deleted) break
                currOwner = currOwner.owner
            }
        }
    }

    if (including.size === 0) return null
    let value = including.values().next().value
    if (value && value.name) {
        return {name: value.name, id: value.id}
    }
    return null
}


export type ComputationUpdateHandler = (
    rootId:           NodeID,
    owner:            Solid.Owner,
    changedStructure: boolean,
) => void

export type TreeWalkerConfig<TEl extends object> = {
    mode:     TreeWalkerMode
    rootId:   NodeID
    onUpdate: ComputationUpdateHandler
    registry: ComponentRegistry<TEl>
    eli:      ElementInterface<TEl>
}

const ElementsMap = new Map<Mapped.Owner, {el: object; component: Mapped.Owner}>()

const $WALKER = Symbol('tree-walker')

function observeComputation<TEl extends object>(
    comp:            Solid.Computation,
    owner_to_update: Solid.Owner,
    config:          TreeWalkerConfig<TEl>,
): void {

    // leaf nodes (ones that don't have children) don't have to cause a structure update
    // Unless the walker is in DOM mode, then we need to observe all computations
    // This is because DOM can change without the owner structure changing
    let was_leaf = !comp.owned || comp.owned.length === 0

    // copy values in case config gets mutated
    let {rootId, onUpdate: onComputationUpdate, mode} = config

    const handler = () => {
        let is_leaf = !comp.owned || comp.owned.length === 0
        let changed_structure = was_leaf !== is_leaf || !is_leaf || mode === TreeWalkerMode.DOM
        was_leaf = is_leaf
        onComputationUpdate(rootId, owner_to_update, changed_structure)
    }

    observeComputationUpdate(comp, handler, $WALKER)
}

function resolveElements<TEl extends object>(
    value: unknown, eli: ElementInterface<TEl>, list: TEl[] = []
): TEl[] {
    pushResolvedElements(list, value, eli)
    return list
}

function pushResolvedElements<TEl extends object>(list: TEl[], value: unknown, eli: ElementInterface<TEl>): void {
    if (value != null) {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (typeof value) {
        case 'function':
            // do not call a function, unless it's a signal (to prevent creating new nodes)
            if (value.length === 0 && value.name === 'bound readSignal') {
                pushResolvedElements(list, value(), eli)
            }
            break
        case 'object':
            if (Array.isArray(value)) {
                for (let item of value) {
                    pushResolvedElements(list, item, eli)
                }
            } else if (eli.isElement(value)) {
                list.push(value)
            }

            break
        }
    }
}

let MappedOwnerNode: Mapped.Owner
let AddedToParentElements = false

/**
 * @param els elements to map
 * @param parent_children parent owner children.
 * Will be checked for existing elements, and if found, `MappedOwnerNode` will be injected in the place of the element.
 * Passing `undefined` will skip this check.
 */
function mapElements<TEl extends object>(
    els:             Iterable<TEl>,
    parent_children: Mapped.Owner[] | undefined,
    eli:             ElementInterface<TEl>,
    out:             Mapped.Owner[] = [],
): Mapped.Owner[] {

    els: for (let el of els) {
        if (!eli.isElement(el)) continue

        if (parent_children) {

            // find el in parent els and remove it
            let to_check = [parent_children]
            let index = 0
            let el_nodes = to_check[index++]

            while (el_nodes) {
                for (let i = 0; i < el_nodes.length; i++) {
                    let el_node = el_nodes[i]!
                    let el_node_data = ElementsMap.get(el_node)
                    if (el_node_data && el_node_data.el === el) {
                        if (AddedToParentElements) {
                            // if the element is already added to the parent, just remove the element
                            el_nodes.splice(i, 1)
                        } else {
                            // otherwise, we can just replace it with the component
                            el_nodes[i] = MappedOwnerNode
                            AddedToParentElements = true
                        }
                        out.push(el_node)
                        el_node_data.component = MappedOwnerNode
                        continue els
                    }
                    if (el_node.children.length) to_check.push(el_node.children)
                }
                el_nodes = to_check[index++]
            }
        }

        let el_json: Mapped.Owner = {
            id:       getSdtId(el, ObjectType.Element),
            type:     NodeType.Element,
            name:     eli.getElementName(el),
            children: [],
        }
        out.push(el_json)
        ElementsMap.set(el_json, {el, component: MappedOwnerNode})

        mapElements(eli.getElementChildren(el), parent_children, eli, el_json.children)
    }

    return out
}

function mapChildren<TEl extends object>(
    owner:     Solid.Owner,
    owner_map: Mapped.Owner | null,
    config:    TreeWalkerConfig<TEl>,
    children:  Mapped.Owner[] = [],
): Mapped.Owner[] {

    for (let child of owner_each_child(owner)) {
        if (config.mode === TreeWalkerMode.Owners ||
            markOwnerType(child) === NodeType.Component
        ) {
            unwrap_append(children, mapOwner(child, owner_map, config))
        } else {
            if (isSolidComputation(child)) {
                observeComputation(child, owner, config)
            }
            mapChildren(child, owner_map, config, children)
        }
    }

    return children
}

function mapOwner<TEl extends object>(
    owner:  Solid.Owner,
    parent: Mapped.Owner | null,
    config: TreeWalkerConfig<TEl>,
): Mapped.Owner | undefined {

    let id   = getSdtId(owner, ObjectType.Owner)
    let type = markOwnerType(owner)
    let name = getNodeName(owner)

    let mapped = {id, type, name, children: []} as Mapped.Owner

    let resolved_els: TEl[] | undefined

    // Component
    if (type === NodeType.Component) {

        let first_owned: Solid.Owner | undefined

        /*
         Context

         <provider> - Component
          ↳ RenderEffect - node with context key (first_owned)
             ↳ children memo - memoizing children fn param
             ↳ children memo - resolving nested children

         The provider component will be omitted
        */
        if (name === 'provider' &&
            owner.owned &&
            owner.owned.length === 1 &&
            markOwnerType(first_owned = owner.owned[0]!) === NodeType.Context
        ) {
            return mapOwner(first_owned, parent, config)
        }

        // Register component to global map
        resolved_els = resolveElements(owner.value, config.eli)
        registerComponent(config.registry, owner as Solid.Component, id, name, resolved_els)

        // Refresh
        // omitting refresh memo — map it's children instead
        let refresh = getComponentRefreshNode(owner as Solid.Component)
        if (refresh) {
            mapped.hmr = true
            owner = refresh
        }
    }
    // Computation
    else if (isSolidComputation(owner)) {
        observeComputation(owner, owner, config)
        if (type != NodeType.Context && (!owner.sources || owner.sources.length === 0)) {
            mapped.frozen = true
        }
    }

    AddedToParentElements = false as boolean
    MappedOwnerNode = mapped

    // Map html elements in DOM mode
    if (config.mode === TreeWalkerMode.DOM) {
        // elements might already be resolved when mapping components
        resolved_els ??= resolveElements(owner.value, config.eli)
        mapElements(resolved_els, parent?.children, config.eli, mapped.children)
    }

    // global `AddedToParentElements` will be changed in mapChildren
    let addedToParent = AddedToParentElements

    mapChildren(owner, mapped, config, mapped.children)

    return addedToParent ? undefined : mapped
}


export const walkSolidTree = /*#__PURE__*/ untrackedCallback(function <TEl extends object>(
    owner:  Solid.Owner | Solid.Root,
    config: TreeWalkerConfig<TEl>,
): Mapped.Owner {

    const r = mapOwner(owner, null, config)!

    if (config.mode === TreeWalkerMode.DOM) {
        // Register all mapped element nodes to their components
        for (let [elNode, {el, component}] of ElementsMap) {
            registerElement(config.registry, component.id, elNode.id, el as TEl)
        }

        ElementsMap.clear()
    }

    return r
})
