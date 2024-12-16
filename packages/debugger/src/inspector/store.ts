import {getSdtId, ObjectType} from '../main/id.ts'
import type {NodeID, Solid} from '../types.ts'

export type StoreNodeProperty = `${NodeID}:${string}`
/**
 * - `undefined` - property deleted;
 * - `{ value: unknown }` - property updated/added;
 * - `number` - array length updated;
 */
export type StoreUpdateData = {value: unknown} | number | undefined

type ParentProperty = StoreNodeProperty | symbol
/**
 * Map of all listened-to store nodes, and their parnet nodeId:property
 * (symbol means it is an observed root node)
 */
const Nodes = new WeakMap<Solid.StoreNode, Set<ParentProperty>>()

export type OnNodeUpdate = (property: StoreNodeProperty, data: StoreUpdateData) => void
let OnNodeUpdate: OnNodeUpdate | null = null
export function setOnStoreNodeUpdate(fn: OnNodeUpdate): void {
    OnNodeUpdate = fn
}

export function startObservingStores() {

    // path solid global dev hook
    SolidStore$$!.hooks.onStoreNodeUpdate = (node, property, value, prev) => {
        if (!OnNodeUpdate || !Nodes.has(node) || typeof property === 'symbol') return

        property = property.toString()
        const storeProperty: StoreNodeProperty = `${getSdtId(
            node,
            ObjectType.StoreNode,
        )}:${property}`
        // Update array length
        if (property === 'length' && typeof value === 'number' && Array.isArray(node)) {
            return OnNodeUpdate(storeProperty, value)
        }
        SolidStore$$!.isWrappable(prev) && untrackStore(prev, storeProperty)
        // Delete property
        if (value === undefined) {
            OnNodeUpdate(storeProperty, undefined)
        }
        // Update/Set property
        else {
            OnNodeUpdate(storeProperty, {value})
            SolidStore$$!.isWrappable(value) && trackStore(value, storeProperty)
        }
    }
}

export function observeStoreNode(rootNode: Solid.StoreNode): VoidFunction {
    // might still pass in a proxy
    rootNode = SolidStore$$!.unwrap(rootNode)
    const symbol = Symbol('inspect-store')

    trackStore(rootNode, symbol)
    return () => untrackStore(rootNode, symbol)
}

function trackStore(node: Solid.StoreNode, parent: ParentProperty): void {
    const data = Nodes.get(node)
    if (data) data.add(parent)
    else {
        Nodes.set(node, new Set([parent]))
        const id = getSdtId(node, ObjectType.StoreNode)
        forEachStoreProp(node, (key, child) => trackStore(child, `${id}:${key}`))
    }
}

function untrackStore(node: Solid.StoreNode, parent: ParentProperty): void {
    const data = Nodes.get(node)
    if (data && data.delete(parent)) {
        data.size === 0 && Nodes.delete(node)
        const id = getSdtId(node, ObjectType.StoreNode)
        forEachStoreProp(node, (key, child) => untrackStore(child, `${id}:${key}`))
    }
}

function forEachStoreProp(
    node: Solid.StoreNode,
    fn: (key: string, node: Solid.StoreNode) => void,
): void {
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            const child = node[i] as Solid.StoreNode
            SolidStore$$!.isWrappable(child) && fn(i.toString(), child)
        }
    } else {
        for (const key in node) {
            const {value, get} = Object.getOwnPropertyDescriptor(node, key)!
            if (!get && SolidStore$$!.isWrappable(value)) fn(key, value)
        }
    }
}
