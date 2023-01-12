import { warn } from '@solid-devtools/shared/utils'
import { getNewSdtId } from './getId'
import { NodeID, Solid } from './types'
import { isDisposed, onOwnerDispose } from './utils'

const IdMap = new WeakMap<object, NodeID>()

export function getSdtId(o: object): NodeID {
  let id = IdMap.get(o)
  if (!id) IdMap.set(o, (id = getNewSdtId()))
  return id
}

/** Used for testing */
export function $setSdtId(o: object, id: NodeID): NodeID {
  IdMap.set(o, id)
  return id
}

export class NodeIDMap<T extends object> {
  private obj: Record<NodeID, T> = {}

  get(id: NodeID): T | undefined {
    return this.obj[id]
  }

  set(o: T): NodeID {
    const id = getSdtId(o)
    if (!(id in this.obj)) this.obj[id] = o
    return id
  }
}

/**
 * Map of all owners
 * Once the owner is disposed, it's removed from the map
 */
const OwnerIdMap = new Map<NodeID, Readonly<Solid.Owner>>()

/**
 * Returns the id of the owner and adds it to the owner map
 * @param o owner
 * @param notDisposed if true, it won't check if the owner is disposed
 */
export function getOwnerId(o: Readonly<Solid.Owner>): NodeID {
  const id = getSdtId(o)
  if (isDisposed(o)) {
    warn('getOwnerId called on disposed owner', o)
    return id
  }
  if (!OwnerIdMap.has(id)) {
    OwnerIdMap.set(id, o)
    onOwnerDispose(o, () => OwnerIdMap.delete(id))
  }
  return id
}

export function getOwnerById(id: NodeID): Solid.Owner | undefined {
  return OwnerIdMap.get(id)
}
