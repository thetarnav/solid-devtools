import {warn} from '@solid-devtools/shared/utils'
import {ObjectType, getSdtId} from './id.ts'
import setup from './setup.ts'
import {type NodeID, type Solid, NodeType} from './types.ts'
import {isSolidRoot, onOwnerCleanup} from './utils.ts'

/**
 * a fake root for collecting signals used top-level
 */
export const UNOWNED_ROOT: Solid.Root = {
    cleanups: null,
    owned:    null,
    context:  null,
    owner:    null,
    name:     'UNOWNED',
    sdtType:  NodeType.Root,
}

// ROOTS
// map of all top-roots
const RootMap = new Map<NodeID, Solid.Root>()
export const getCurrentRoots = (): Iterable<Solid.Root> => RootMap.values()

let OnOwnerNeedsUpdate: ((owner: Solid.Owner, rootId: NodeID) => void) | undefined
/** Listens to owners that have their structure changed, because of roots */
export function setOnOwnerNeedsUpdate(fn: typeof OnOwnerNeedsUpdate) {
    OnOwnerNeedsUpdate = fn
}
let OnRootRemoved: ((rootId: NodeID) => void) | undefined
/** Listens to roots that were removed */
export function setOnRootRemoved(fn: typeof OnRootRemoved) {
    OnRootRemoved = fn
}

export function createTopRoot(owner: Solid.Root): void {
    const rootId = getSdtId(owner, ObjectType.Owner)
    RootMap.set(rootId, owner)
    OnOwnerNeedsUpdate?.(owner, rootId)
}

function cleanupRoot(root: Solid.Root): void {
    const rootId = getSdtId(root, ObjectType.Owner)
    root.isDisposed = true
    changeRootAttachment(root, null)

    const wasTarcked = RootMap.delete(rootId)
    if (wasTarcked) OnRootRemoved?.(rootId)
}

/**
 * For switching what owner sub-roots are attached to.
 * It'll remove the root from its current owner and attach it to the new owner.
 */
function changeRootAttachment(root: Solid.Root, newParent: Solid.Owner | null): void {
    let topRoot: Solid.Root | undefined | null

    if (root.attachedTo) {
        root.attachedTo.sdtSubRoots!.splice(root.attachedTo.sdtSubRoots!.indexOf(root), 1)
        topRoot = getTopRoot(root.attachedTo)
        if (topRoot) OnOwnerNeedsUpdate?.(root.attachedTo, getSdtId(topRoot, ObjectType.Owner))
    }

    if (newParent) {
        root.attachedTo = newParent
        if (newParent.sdtSubRoots) newParent.sdtSubRoots.push(root)
        else newParent.sdtSubRoots = [root]

        if (topRoot === undefined) topRoot = getTopRoot(newParent)
        if (topRoot) OnOwnerNeedsUpdate?.(newParent, getSdtId(topRoot, ObjectType.Owner))
    } else {
        delete root.attachedTo
    }
}

/**
 * Helps the debugger find and reattach an reactive owner created by `createRoot` to it's detached parent.
 *
 * Call this synchronously inside `createRoot` callback body, whenever you are using `createRoot` yourself to dispose of computations early, or inside `<For>`/`<Index>` components to reattach their children to reactive graph visible by the devtools debugger.
 * @example
 * createRoot(dispose => {
 * 	// This reactive Owner disapears form the owner tree
 *
 * 	// Reattach the Owner to the tree:
 * 	attachDebugger();
 * });
 */
export function attachDebugger(owner = setup.solid.getOwner()): void {

    if (!owner)
        return warn('reatachOwner helper should be called synchronously in a reactive owner.')

    // find all the roots in the owner tree (walking up the tree)
    const roots: Solid.Root[] = []
    let isFirstTopLevel = true
    while (owner) {
        if (isSolidRoot(owner)) {
            // disposed
            if (owner.isDisposed) return
            // already attached
            if (RootMap.has(getSdtId(owner, ObjectType.Owner))) {
                isFirstTopLevel = false
                break
            }
            roots.push(owner)
        }
        owner = owner.owner
    }

    // attach roots in reverse order (from top to bottom)
    for (let i = roots.length - 1; i >= 0; i--) {
        const root = roots[i]!
        root.sdtType = NodeType.Root

        onOwnerCleanup(root, () => cleanupRoot(root), true)

        const isTopLevel = isFirstTopLevel && i === 0

        // root (top-level)
        if (isTopLevel) {
            createTopRoot(root)
            return
        }
        // sub-root (nested)
        let parent = findClosestAliveParent(root)
        if (!parent.owner) return warn('Parent owner is missing.')
        changeRootAttachment(root, parent.owner)

        const onParentCleanup = () => {
            const newParent = findClosestAliveParent(root)
            changeRootAttachment(root, newParent.owner)
            // still a sub-root
            if (newParent.owner) {
                parent = newParent
                onOwnerCleanup(parent.root, onParentCleanup)
            }
            // becomes a root
            else {
                removeOwnCleanup()
                createTopRoot(root)
            }
        }
        const removeParentCleanup = onOwnerCleanup(parent.root, onParentCleanup)
        const removeOwnCleanup = onOwnerCleanup(root, removeParentCleanup)
    }
}

export function initRoots() {

    /* Attach the UNOWNED Root */
    attachDebugger(UNOWNED_ROOT)

    /* Get owners created before debugger loaded */
    for (const e of setup.get_created_owners()) {
        attachDebugger(e)
    }
    
    /* Listen to new created owners */
    setup.solid.hooks.afterCreateOwner = function (owner) {
        if (isSolidRoot(owner)) {
            attachDebugger(owner)
        }
    }
}

/**
 * Finds the top-level root owner of a given owner.
 */
export function getTopRoot(owner: Solid.Owner): Solid.Root | null {
    let root: Solid.Root | null = null
    do {
        if (isSolidRoot(owner) && !owner.isDisposed) root = owner
        owner = owner.owner!
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } while (owner)
    return root
}

/**
 * Searches for the closest alive parent of the given owner.
 * A parent here consists of `{ owner: SolidOwner; root: SolidRoot }` where `owner` is the closest tree node to attach to, and `root` in the closest subroot/root that is not disposed.
 * @param owner
 * @returns `{ owner: SolidOwner; root: SolidRoot }`
 */
export function findClosestAliveParent(
    owner: Solid.Owner,
): {owner: Solid.Owner; root: Solid.Root} | {owner: null; root: null} {
    let disposed: Solid.Root | null = null
    let closestAliveRoot: Solid.Root | null = null
    let current = owner
    while (current.owner && !closestAliveRoot) {
        current = current.owner
        if (isSolidRoot(current)) {
            if (current.isDisposed) disposed = current
            else closestAliveRoot = current
        }
    }
    if (!closestAliveRoot) return {owner: null, root: null}
    return {owner: (disposed ?? owner).owner!, root: closestAliveRoot}
}
