import { NodeID } from "@solid-devtools/shared/graph"
import { mutateFilter } from "@solid-devtools/shared/utils"

export const dispose = (o: { dispose?: VoidFunction }) => o.dispose?.()
export const disposeAll = (list: { dispose?: VoidFunction }[]) => list.forEach(dispose)

export function deleteKey<K extends PropertyKey>(this: { [_ in K]?: unknown }, key: K) {
  delete this[key]
}

/**
 * Reconciles an array by mutating it. Diffs items by "id" prop. And uses {@link mapFunc} for creating new items.
 * Use for dynamic arrays that can change entirely. Like sources or observers.
 */
export function reconcileArrayByIds<T extends { id: NodeID }>(
  ids: readonly NodeID[],
  array: T[],
  mapFunc: (id: NodeID, array: T[]) => void,
): void {
  const removed: T[] = []
  const intersection: NodeID[] = []
  let id: NodeID
  for (const item of array) {
    id = item.id
    if (ids.includes(id)) intersection.push(id)
    else removed.push(item)
  }
  mutateFilter(array, o => !removed.includes(o))
  for (id of ids) intersection.includes(id) || mapFunc(id, array)
}
