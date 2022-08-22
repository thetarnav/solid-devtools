import { Accessor, createSelector, createSignal } from "solid-js"
import { NodeID } from "@solid-devtools/shared/graph"
import { mutateFilter } from "@solid-devtools/shared/utils"

export const dispose = (o: { dispose?: VoidFunction }) => o.dispose?.()
export const disposeAll = (list: { dispose?: VoidFunction }[]) => list.forEach(dispose)

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

export function createArrayIncludesSelector<T>(
  array: Accessor<readonly T[]>,
): (item: T) => Accessor<boolean> {
  const selector = createSelector(array, (id, arr) => arr.includes(id))
  return item => selector.bind(void 0, item)
}

export function createUpdatedSelector(): [
  useSelector: (id: NodeID) => Accessor<boolean>,
  addUpdated: (ids: readonly NodeID[]) => void,
  clear: VoidFunction,
] {
  const [updated, setUpdated] = createSignal<NodeID[]>([])
  const useSelector = createArrayIncludesSelector(updated)
  return [
    useSelector,
    ids => setUpdated(prev => [...new Set([...prev, ...ids])]),
    () => setUpdated([]),
  ]
}

// /**
//  *
//  * @param array
//  * @param setter
//  * @returns a boolean indicating if the item was added (adding already existing item will return `false`)
//  */
//  export function createArraySetToggle<T>(
//   array: Accessor<readonly T[]>,
//   setter: Setter<readonly T[]>,
// ): (item: T, state?: boolean) => boolean {
//   return (item, state) => {
//     const prev = untrack(array)
//     const index = prev.indexOf(item)
//     if (index === -1) {
//       if (state === undefined || state) {
//         setter(prev => push(prev, item))
//         return true
//       }
//     } else if (state === undefined || !state) setter(prev => splice(prev, index, 1))
//     return false
//   }
// }
