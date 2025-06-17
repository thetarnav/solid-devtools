import {untrackedCallback} from '@solid-devtools/shared/primitives'
import {ObjectType, getSdtId, get_id_el} from '../main/id.ts'
import {observeComputationUpdate} from '../main/observe.ts'
import {
    type ElementChildren,
    type ElementInterface,
    type Mapped,
    type NodeID,
    type Solid,
    NodeType,
    TreeWalkerMode,
    UNKNOWN,
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
    element_nodes: Map<NodeID, {el: TEl; component: ComponentData<TEl>}>,
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
    r:            ComponentRegistry<TEl>,
    component_id: NodeID | null,
    element_id:   NodeID,
    element:      TEl,
): void => {
    // TODO: also allow registering elements without a component
    if (component_id == null) {
        return
    }

    let component = r.components.get(component_id)
    if (component == null) return

    component.element_nodes.add(element_id)
    r.element_nodes.set(element_id, {el: element, component})
}

export
const getComponent = <TEl extends object>(
    r:  ComponentRegistry<TEl>,
    id: NodeID,
): {name: string | undefined; id: NodeID; elements: TEl[]} | null => {
    // provided if might be of an element node (in DOM mode) or component node
    // both need to be checked

    let component = r.components.get(id)
    if (component != null) return {
        name:     component.name,
        elements: [...component.elements],
        id:       id,
    }

    let el_data = r.element_nodes.get(id)
    if (el_data == null) return null

    return {
        name:     el_data.component.name,
        id:       el_data.component.id,
        elements: [el_data.el],
    }
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
    element_id: NodeID,
): {name: string | undefined; id: NodeID; element: TEl} | undefined => {
    let el_data = r.element_nodes.get(element_id)
    if (el_data != null) return {
        name:    el_data.component.name,
        id:      el_data.component.id,
        element: el_data.el,
    }
}

export
const findComponent = <TEl extends object>(
    r: ComponentRegistry<TEl>,
    el: TEl,
): ComponentData<TEl> | null => {

    let including = new Map<Solid.Owner, ComponentData<TEl>>()
    
    for (let curr: TEl | null = el;
        curr != null && including.size === 0;
    ) {
        for (let comp of r.components.values()) {
            for (let comp_el of comp.elements) {
                if (comp_el === curr) {
                    including.set(comp.owner, comp)
                }
            }
        }
        curr = r.eli.getParent(curr) // go up
    }

    if (including.size > 1) {
        // find the closest component
        for (let owner of including.keys()) {
            if (including.has(owner)) {
                for (let curr = owner.owner; curr != null;) {
                    if (including.delete(curr)) break
                    curr = curr.owner // go up
                }
            }
        }
    }

    return including.values().next().value ?? null
}


export
type ComputationUpdateHandler = (
    rootId:           NodeID,
    owner:            Solid.Owner,
    changedStructure: boolean,
) => void

export
type TreeWalkerConfig<TEl extends object> = {
    mode:     TreeWalkerMode
    rootId:   NodeID
    onUpdate: ComputationUpdateHandler
    registry: ComponentRegistry<TEl>
    eli:      ElementInterface<TEl>
}

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

function mapChildren<TEl extends object>(
    owner:        Solid.Owner,
    component_id: NodeID | null,
    config:       TreeWalkerConfig<TEl>,
    children:     Mapped.Owner[] = [],
): Mapped.Owner[] {

    for (let child of owner_each_child(owner)) {
        if (config.mode === TreeWalkerMode.Owners ||
            markOwnerType(child) === NodeType.Component
        ) {
            unwrap_append(children, mapOwner(child, component_id, config))
        } else {
            if (isSolidComputation(child)) {
                observeComputation(child, owner, config)
            }
            mapChildren(child, component_id, config, children)
        }
    }

    return children
}

let els_seen = new Set<object>()

function add_new_el_json<TEl extends object>(
    child_arr: Mapped.Owner[],
    el:        TEl,
    comp_id:   NodeID | null,
    config:    TreeWalkerConfig<TEl>,
): Mapped.Owner {
    let el_json: Mapped.Owner = {
        id:       get_id_el(el),
        type:     NodeType.Element,
        name:     config.eli.getName(el) ?? UNKNOWN,
        children: [],
    }
    child_arr.push(el_json)
    els_seen.add(el)
    registerElement(config.registry, comp_id, el_json.id, el)
    return el_json
}

function mapOwner<TEl extends object>(
    owner:        Solid.Owner,
    /** last seen component id - for registering elements to components */
    last_comp_id: NodeID | null,
    config:       TreeWalkerConfig<TEl>,
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
            owner.owned != null &&
            owner.owned.length === 1 &&
            markOwnerType(first_owned = owner.owned[0]!) === NodeType.Context
        ) {
            return mapOwner(first_owned, last_comp_id, config)
        }

        // Register component to global map
        resolved_els = resolveElements(owner.value, config.eli)
        registerComponent(config.registry, owner as Solid.Component, id, name, resolved_els)

        // Refresh
        // omitting refresh memo — map it's children instead
        let refresh = getComponentRefreshNode(owner as Solid.Component)
        if (refresh != null) {
            mapped.hmr = true
            owner = refresh
        }

        /* This owner is now last seen component */
        last_comp_id = id
    }
    // Computation
    else if (isSolidComputation(owner)) {
        observeComputation(owner, owner, config)
        if (type != NodeType.Context && (!owner.sources || owner.sources.length === 0)) {
            mapped.frozen = true
        }
    }

    mapChildren(owner, last_comp_id, config, mapped.children)
    
    // Map html elements in DOM mode
    if (config.mode === TreeWalkerMode.DOM) {

        // elements might already be resolved when mapping components
        resolved_els ??= resolveElements(owner.value, config.eli)

        let stack_els_arr: ElementChildren<TEl>[] = [resolved_els]
        let stack_els_idx = [0]
        let stack_els_own = [mapped]
        let stack_els_len = 1

        let stack_child_arr = [mapped.children]
        let stack_child_idx = [0]
        let stack_child_len = 1

        while (stack_child_len > 0) {
            let child_arr = stack_child_arr[stack_child_len-1]!
            let child_idx = stack_child_idx[stack_child_len-1]!

            if (child_idx >= child_arr.length) {
                stack_child_len -= 1
                continue
            }

            stack_child_idx[stack_child_len-1]! += 1

            let child = child_arr[child_idx]!

            /* Other children are already in mapped children so will be skipped */
            if (child.type !== NodeType.Element) {
                stack_child_arr[stack_child_len] = child.children
                stack_child_idx[stack_child_len] = 0
                stack_child_len += 1
                continue
            }
            
            // Don't go over added element children
            if (stack_child_len === 1)
                continue

            /*  Check each element and its children
                - not seen -> add it to the owner
                - a child of the current child -> add it to the owner
                - already seen -> skip it
            */
            while (stack_els_len > 0) {
                let el_arr = stack_els_arr[stack_els_len-1]!
                let el_idx = stack_els_idx[stack_els_len-1]!
                let el_own = stack_els_own[stack_els_len-1]!

                if (el_idx >= el_arr.length) {
                    stack_els_len -= 1
                    continue
                }

                stack_els_idx[stack_els_len-1]! += 1

                let el = el_arr[el_idx]!
                
                /* Child has this element */
                if (get_id_el(el) === child.id) {
                    /*
                        Push child to the owner
                        and previous ones that were not pushed yet
                    */
                    el_own.children.push(...mapped.children.splice(0, stack_child_idx[0]))
                    stack_child_idx[0] = 0
                    stack_child_len = 1

                    // Skip remaining elements from the child
                    for (let ci = child_idx + 1; ci < child_arr.length; ci++) {
                        let ei = stack_els_idx[stack_els_len-1]!

                        if (ei >= el_arr.length || child_arr[ci]!.id !== get_id_el(el_arr[ei]!))
                            break

                        stack_els_idx[stack_els_len-1]! += 1
                    }

                    break
                }

                /* Not seen yet */
                if (!els_seen.has(el)) {
                    stack_els_arr[stack_els_len] = config.eli.getChildren(el)
                    stack_els_idx[stack_els_len] = 0
                    stack_els_own[stack_els_len] = add_new_el_json(el_own.children, el, last_comp_id, config)
                    stack_els_len += 1
                }
            }
        }

        // append remaining elements to children
        while (stack_els_len > 0) {
            let el_arr = stack_els_arr[stack_els_len-1]!
            let el_idx = stack_els_idx[stack_els_len-1]!
            let el_own = stack_els_own[stack_els_len-1]!

            if (el_idx >= el_arr.length) {
                stack_els_len -= 1
                continue
            }

            stack_els_idx[stack_els_len-1]! += 1

            let el = el_arr[el_idx]!

            if (!els_seen.has(el)) {
                stack_els_arr[stack_els_len] = config.eli.getChildren(el)
                stack_els_idx[stack_els_len] = 0
                stack_els_own[stack_els_len] = add_new_el_json(el_own.children, el, last_comp_id, config)
                stack_els_len += 1
            }
        }
    }

    return mapped
}

export
const walkSolidTree = /*#__PURE__*/ untrackedCallback(function <TEl extends object>(
    owner:  Solid.Owner | Solid.Root,
    config: TreeWalkerConfig<TEl>,
): Mapped.Owner {

    let r = mapOwner(owner, null, config)!

    els_seen.clear()

    return r
})
