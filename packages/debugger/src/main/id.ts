import { getNewSdtId } from './get-id'
import { NodeID, Solid } from './types'

export const enum ObjectType {
  Owner = 'owner',
  Element = 'element',
  Signal = 'signal',
  Store = 'store',
  StoreNode = 'store-node',
}

type ValueMap = {
  [ObjectType.Owner]: Solid.Owner
  [ObjectType.Element]: Element
  [ObjectType.Signal]: Solid.Signal
  [ObjectType.Store]: Solid.Store
  [ObjectType.StoreNode]: Solid.StoreNode
}

const WeakIdMap = new WeakMap<ValueMap[ObjectType], NodeID>()

const RefMapMap: {
  readonly [T in ObjectType]: Map<NodeID, WeakRef<ValueMap[T]>>
} = {
  [ObjectType.Owner]: new Map(),
  [ObjectType.Element]: new Map(),
  [ObjectType.Signal]: new Map(),
  [ObjectType.Store]: new Map(),
  [ObjectType.StoreNode]: new Map(),
}

const CleanupRegistry = new FinalizationRegistry((data: { map: ObjectType; id: NodeID }) => {
  RefMapMap[data.map].delete(data.id)
})

export function getSdtId<T extends ObjectType>(obj: ValueMap[T], objType: T): NodeID {
  let id = WeakIdMap.get(obj)
  if (!id) {
    id = getNewSdtId()
    WeakIdMap.set(obj, id)
    RefMapMap[objType].set(id, new WeakRef(obj))
    CleanupRegistry.register(obj, { map: objType, id })
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
