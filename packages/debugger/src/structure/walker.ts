import {untrackedCallback} from '@solid-devtools/shared/primitives'
import {asArray} from '@solid-devtools/shared/utils'
import type {ComponentRegisterHandler} from '../main/component-registry.ts'
import {ObjectType, getSdtId} from '../main/id.ts'
import {observeComputationUpdate} from '../main/observe.ts'
import {type Mapped, type NodeID, type Solid, NodeType, TreeWalkerMode} from '../main/types.ts'
import {
    getComponentRefreshNode,
    getNodeName,
    isSolidComputation,
    markOwnerType,
    resolveElements,
} from '../main/utils.ts'

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

const ElementsMap = new Map<Mapped.Owner, {el: HTMLElement; component: Mapped.Owner}>()

const $WALKER = Symbol('tree-walker')

function observeComputation(comp: Solid.Computation, owner_to_update: Solid.Owner): void {

    // leaf nodes (ones that don't have children) don't have to cause a structure update
    // Unless the walker is in DOM mode, then we need to observe all computations
    // This is because DOM can change without the owner structure changing
    let was_leaf = !comp.owned || comp.owned.length === 0

    // copy globals
    let root_id = RootId
    let on_computation_update = OnComputationUpdate
    let mode = Mode

    const handler = () => {
        let is_leaf = !comp.owned || comp.owned.length === 0
        let changed_structure = was_leaf !== is_leaf || !is_leaf || mode === TreeWalkerMode.DOM
        was_leaf = is_leaf
        on_computation_update(root_id, owner_to_update, changed_structure)
    }

    observeComputationUpdate(comp, handler, $WALKER)
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
                if (isSolidComputation(child)) observeComputation(child, owner)
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
                    const elNodeData = ElementsMap.get(elNode)
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
                    if (elNode.children.length) toCheck.push(elNode.children)
                }
                elNodes = toCheck[index++]
            }
        }

        const mappedEl: Mapped.Owner = {
            id: getSdtId(el, ObjectType.Element),
            type: NodeType.Element,
            name: el.localName,
            children: [],
        }
        r.push(mappedEl)
        ElementsMap.set(mappedEl, {el, component: MappedOwnerNode})

        if (el.children.length) mappedEl.children = mapElements(el.children, parentChildren)
    }

    return r
}

function mapOwner(
    owner:  Solid.Owner,
    parent: Mapped.Owner | null,
): Mapped.Owner | undefined {

    const id   = getSdtId(owner, ObjectType.Owner)
    const type = markOwnerType(owner)
    const name = getNodeName(owner)

    const mapped = {id, type, name} as Mapped.Owner

    let resolvedElements: ReturnType<typeof resolveElements> | undefined

    // Component
    if (type === NodeType.Component) {

        let first_owned: Solid.Owner | undefined

        /*
         solid.lazy(MyComponent) hoc
          ↳ wrap (callback returned from lazy, called as a component)
             ↳ memo
                ↳ MyComponent
        */
        if (name === 'wrap' &&
            typeof ((owner as Solid.Component).component as any)?.preload === 'function' &&
            owner.owned &&
            owner.owned.length === 1 &&
            markOwnerType((first_owned = owner.owned[0]!)) === NodeType.Memo &&
            first_owned.owned &&
            first_owned.owned.length === 1 &&
            markOwnerType((first_owned = first_owned.owned[0]!)) === NodeType.Component
        ) {
            return mapOwner(first_owned, parent)
        }

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
            markOwnerType((first_owned = owner.owned[0]!)) === NodeType.Context
        ) {
            return mapOwner(first_owned, parent)
        }

        // Register component to global map
        RegisterComponent({
            owner: owner as Solid.Component,
            id,
            name,
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
    else if (isSolidComputation(owner)) {
        observeComputation(owner, owner)
        if (type != NodeType.Context && (!owner.sources || owner.sources.length === 0)) {
            mapped.frozen = true
        }
    }

    const children: Mapped.Owner[] = []
    mapped.children = children

    AddedToParentElements = false as boolean
    MappedOwnerNode = mapped

    // Map html elements in DOM mode
    // elements might already be resolved when mapping components
    if (Mode === TreeWalkerMode.DOM &&
        (resolvedElements = resolvedElements === undefined
            ? resolveElements(owner.value)
            : resolvedElements)
    ) {
        children.push.apply(children, mapElements(asArray(resolvedElements), parent?.children))
    }

    // global `AddedToParentElements` will be changed in mapChildren
    const addedToParent = AddedToParentElements

    children.push.apply(children, mapChildren(owner, mapped))

    return addedToParent ? undefined : mapped
}

export const walkSolidTree = /*#__PURE__*/ untrackedCallback(function (
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
        for (const [elNode, {el, component}] of ElementsMap) {
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
})
