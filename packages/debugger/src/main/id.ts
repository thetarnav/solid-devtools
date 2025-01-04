import {type NodeID, type Solid} from './types.ts'

export const enum ObjectType {
    Owner       = 'OWNER',
    Element     = 'ELEMENT',
    Signal      = 'SIGNAL',
    Store       = 'STORE',
    StoreNode   = 'STORE_NODE',
    CustomValue = 'CUSTOM_VALUE',
}

type ValueMap = {
    [ObjectType.Owner]:       Solid.Owner
    [ObjectType.Element]:     Element
    [ObjectType.Signal]:      Solid.Signal
    [ObjectType.Store]:       Solid.Store
    [ObjectType.StoreNode]:   Solid.StoreNode
    [ObjectType.CustomValue]: Solid.SourceMapValue
}

const WeakIdMap = new WeakMap<ValueMap[ObjectType], NodeID>()

const RefMapMap: {
    readonly [T in ObjectType]: Map<NodeID, WeakRef<ValueMap[T]>>
} = {
    [ObjectType.Owner]:       new Map(),
    [ObjectType.Element]:     new Map(),
    [ObjectType.Signal]:      new Map(),
    [ObjectType.Store]:       new Map(),
    [ObjectType.StoreNode]:   new Map(),
    [ObjectType.CustomValue]: new Map(),
}

const CleanupRegistry = new FinalizationRegistry((data: {map: ObjectType; id: NodeID}) => {
    RefMapMap[data.map].delete(data.id)
})

let LastId = 0
export const getNewSdtId = (): NodeID => `#${(LastId++).toString(36)}`

export function getSdtId<T extends ObjectType>(obj: ValueMap[T], objType: T): NodeID {
    let id = WeakIdMap.get(obj)
    if (!id) {
        id = getNewSdtId()
        WeakIdMap.set(obj, id)
        RefMapMap[objType].set(id, new WeakRef(obj))
        CleanupRegistry.register(obj, {map: objType, id})
    }
    return id
}

export function getObjectById<T extends ObjectType>(id: NodeID, objType: T): ValueMap[T] | null {
    const ref = RefMapMap[objType].get(id)
    return ref?.deref() ?? null
}

/** Used for testing */
export function $setSdtId(o: object, id: NodeID): NodeID {
    WeakIdMap.set(o, id)
    return id
}
