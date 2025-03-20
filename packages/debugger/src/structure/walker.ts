import {untrackedCallback} from '@solid-devtools/shared/primitives'
import type {ComponentRegisterHandler} from '../main/component-registry.ts'
import {ObjectType, getSdtId} from '../main/id.ts'
import {observeComputationUpdate} from '../main/observe.ts'
import {
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
    owner_each_child,
} from '../main/utils.ts'

export type ComputationUpdateHandler = (
    rootId:           NodeID,
    owner:            Solid.Owner,
    changedStructure: boolean,
) => void

export type TreeWalkerConfig = {
    mode:                TreeWalkerMode
    rootId:              NodeID
    onComputationUpdate: ComputationUpdateHandler
    registerComponent:   ComponentRegisterHandler
}

const $WALKER = Symbol('tree-walker')

function observeComputation(
    comp:            Solid.Computation,
    owner_to_update: Solid.Owner,
    config:          TreeWalkerConfig,
): void {

    // leaf nodes (ones that don't have children) don't have to cause a structure update
    // Unless the walker is in DOM mode, then we need to observe all computations
    // This is because DOM can change without the owner structure changing
    let was_leaf = !comp.owned || comp.owned.length === 0

    // copy values in case config gets mutated
    let {rootId, onComputationUpdate, mode} = config

    const handler = () => {
        let is_leaf = !comp.owned || comp.owned.length === 0
        let changed_structure = was_leaf !== is_leaf || !is_leaf || mode === TreeWalkerMode.DOM
        was_leaf = is_leaf
        onComputationUpdate(rootId, owner_to_update, changed_structure)
    }

    observeComputationUpdate(comp, handler, $WALKER)
}

function resolveElements(
    value: unknown, list: Element[] = []
): Element[] {
    pushResolvedElements(list, value)
    return list
}

function pushResolvedElements(list: Element[], value: unknown): void {
    if (value != null) {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (typeof value) {
        case 'function':
            // do not call a function, unless it's a signal (to prevent creating new nodes)
            if (value.length === 0 && value.name === 'bound readSignal') {
                pushResolvedElements(list, value())
            }
            break
        case 'object':
            if (Array.isArray(value)) {
                for (let item of value) {
                    pushResolvedElements(list, item)
                }
            } else if (value instanceof Element) {
                list.push(value)
            }

            break
        }
    }
}

/**
 * Updates a map of Element to Component_Owner by traversing the owner tree
 * 
 * @param owner owner to start traversal from
 * @param eli   Element interface
 * @param map   Optional existing map to update
 * 
 * The elements are resolved shallowly,
 * so only top-level elements will be mapped to their components.
 */
export function gatherElementMap(
    owner: Solid.Owner,
    map:   Map<Element, Solid.Component> = new Map(),
): Map<Element, Solid.Component> {

    if (markOwnerType(owner) === NodeType.Component) {
        for (let el of resolveElements(owner.value)) {
            map.set(el, owner as Solid.Component)
        }
    }
    
    for (let child of owner_each_child(owner)) {
        gatherElementMap(child, map)
    }
    
    return map
}

function mapChildren(
    owner:     Solid.Owner,
    owner_map: Mapped.Owner | null,
    config:    TreeWalkerConfig,
    children:  Mapped.Owner[] = [],
): Mapped.Owner[] {

    for (let child of owner_each_child(owner)) {
        if (config.mode === TreeWalkerMode.Owners ||
            markOwnerType(child) === NodeType.Component
        ) {
            children.push(mapOwner(child, owner_map, config))
        } else {
            if (isSolidComputation(child)) {
                observeComputation(child, owner, config)
            }
            mapChildren(child, owner_map, config, children)
        }
    }

    return children
}

let element_set = new Set<any>()

function mapOwner(
    owner:  Solid.Owner,
    parent: Mapped.Owner | null,
    config: TreeWalkerConfig,
): Mapped.Owner {

    const id   = getSdtId(owner, ObjectType.Owner)
    const type = markOwnerType(owner)
    const name = getNodeName(owner)

    const mapped = {id, type, name, children: []} as Mapped.Owner

    let resolved_elements: Element[] | undefined

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
            return mapOwner(first_owned, parent, config)
        }

        // Register component to global map
        config.registerComponent({
            owner:    owner as Solid.Component,
            id:       id,
            name:     name,
            elements: (resolved_elements = resolveElements(owner.value)),
        })

        // Refresh
        // omitting refresh memo — map it's children instead
        let refresh = getComponentRefreshNode(owner as Solid.Component)
        if (refresh != null) {
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

    mapChildren(owner, mapped, config, mapped.children)
    
    // Map html elements in DOM mode
    if (config.mode === TreeWalkerMode.DOM) {
        // elements might already be resolved when mapping components
        resolved_elements ??= resolveElements(owner.value)

        let elements_stack_arr = [resolved_elements] as (Iterable<Element> & ArrayLike<Element>)[]
        let elements_stack_idx = [0]
        let elements_stack_owner = [mapped]
        let elements_stack_len = 1

        let children_stack_arr = [mapped.children]
        let children_stack_idx = [0]
        let children_stack_len = 1

        while (children_stack_len > 0) {
            
            let children  = children_stack_arr[children_stack_len-1]!
            let child_idx = children_stack_idx[children_stack_len-1]!

            if (child_idx >= children.length) {
                children_stack_len -= 1
                continue
            }

            children_stack_idx[children_stack_len-1]! += 1

            let child = children[child_idx]!
            
            if (child.type === NodeType.Element) {

                // Don't go over added element children
                // TODO: add children cap stack
                if (children_stack_len-1 === 0) {
                    continue
                }
                
                while (elements_stack_len > 0) {
            
                    let elements = elements_stack_arr  [elements_stack_len-1]!
                    let el_idx   = elements_stack_idx  [elements_stack_len-1]!
                    let el_owner = elements_stack_owner[elements_stack_len-1]!

                    if (el_idx >= elements.length) {
                        elements_stack_len -= 1
                        continue
                    }

                    elements_stack_idx[elements_stack_len-1]! += 1

                    let el = elements[el_idx]!
                    let el_id = getSdtId(el, ObjectType.Element)
                    
                    // Child has this element
                    if (el_id === child.id) {
                        if (elements_stack_len > 1) {
                            el_owner.children.push(children_stack_arr[0]![children_stack_idx[0]!-1]!)
                            children_stack_arr[0]!.splice(children_stack_idx[0]!-1, 1)
                            children_stack_idx[0]! -= 1
                        }
                        children_stack_len = 0

                        // Skip remaining elements from the child
                        for (let skip_child_idx = child_idx + 1;;) {
                            let el_idx = elements_stack_idx[elements_stack_len-1]!

                            if (el_idx >= elements.length ||
                                skip_child_idx >= children.length ||
                                children[skip_child_idx]!.id !== getSdtId(elements[el_idx]!, ObjectType.Element)
                            ) {
                                break
                            }

                            elements_stack_idx[elements_stack_len-1]! += 1
                            skip_child_idx += 1
                        }

                        break
                    }

                    if (element_set.has(el)) {
                        continue
                    }

                    else {
                        let el_json: Mapped.Owner = {
                            id:       el_id,
                            type:     NodeType.Element,
                            name:     el.tagName.toLowerCase(),
                            children: [],
                        }
                        el_owner.children.push(el_json)
                        element_set.add(el)

                        elements_stack_arr  [elements_stack_len] = el.children
                        elements_stack_idx  [elements_stack_len] = 0
                        elements_stack_owner[elements_stack_len] = el_json
                        elements_stack_len += 1
                    }
                }

            } else {
                children_stack_arr[children_stack_len] = child.children
                children_stack_idx[children_stack_len] = 0
                children_stack_len += 1
                continue
            }
        }

        // append remaining elements to children
        while (elements_stack_len > 0) {
            let elements = elements_stack_arr  [elements_stack_len-1]!
            let idx      = elements_stack_idx  [elements_stack_len-1]!
            let el_owner = elements_stack_owner[elements_stack_len-1]!

            if (idx >= elements.length) {
                elements_stack_len -= 1
                continue
            }

            elements_stack_idx[elements_stack_len-1]! += 1

            let el = elements[idx]!

            if (element_set.has(el)) {
                continue
            }

            let el_json: Mapped.Owner = {
                id:       getSdtId(el, ObjectType.Element),
                type:     NodeType.Element,
                name:     el.tagName.toLowerCase(),
                children: [],
            }
            el_owner.children.push(el_json)
            element_set.add(el)

            elements_stack_arr  [elements_stack_len] = el.children
            elements_stack_idx  [elements_stack_len] = 0
            elements_stack_owner[elements_stack_len] = el_json
            elements_stack_len += 1
        }
    }

    return mapped
}

export const walkSolidTree = /*#__PURE__*/ untrackedCallback(function (
    owner:  Solid.Owner | Solid.Root,
    config: TreeWalkerConfig,
): Mapped.Owner {

    if (config.mode === TreeWalkerMode.DOM) {

        let res = mapOwner(owner, null, config)

        // Register all mapped element nodes to their components
        // for (let [el, o] of el_map) {
        //     config.registerComponent({
        //         element:     el,
        //         componentId: getSdtId(o, ObjectType.Owner),
        //         elementId:   getSdtId(el, ObjectType.Element),
        //     })
        // }

        element_set.clear()

        return res
    }

    return mapOwner(owner, null, config)
})
