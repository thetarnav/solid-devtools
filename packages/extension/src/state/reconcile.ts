import { createRoot, createSignal, getOwner, onCleanup } from "solid-js"
import { mutateFilter, pushToArrayProp } from "@solid-devtools/shared/utils"
import { MappedOwner, MappedSignal, GraphOwner, GraphSignal } from "@solid-devtools/shared/graph"

const dispose = (o: { dispose?: VoidFunction }) => o.dispose?.()
const disposeAll = (list: { dispose?: VoidFunction }[]) => list.forEach(dispose)
function deleteKey<K extends PropertyKey>(this: { [_ in K]?: unknown }, key: K) {
  delete this[key]
}
function compareId(this: { id: number }, o: { id: number }) {
  return this.id === o.id
}

/**
 * Reconciles an array by mutating it. Diffs items by "id" prop. And uses {@link mapFunc} for creating new items.
 * Use for dynamic arrays that can change entirely. Like sources or observers.
 */
function reconcileArrayByIds<T extends { id: number }>(
  ids: readonly number[],
  array: T[],
  mapFunc: (id: number, array: T[]) => void,
): void {
  const removed: T[] = []
  const intersection: number[] = []
  let id: number
  for (const item of array) {
    id = item.id
    if (ids.includes(id)) intersection.push(id)
    else removed.push(item)
  }
  mutateFilter(array, o => !removed.includes(o))
  for (id of ids) intersection.includes(id) || mapFunc(id, array)
}

const signalsUpdated = new Set<number>()
const ownersUpdated = new Set<number>()

// TODO: when the roots should be removed from here?
const NodeMap: Record<
  number,
  {
    owners: Record<number, GraphOwner>
    signals: Record<number, GraphSignal>
  }
> = {}

// TODO: map source/observers length separately, as these won't always resolve
let sourcesToAddLazy: Record<number, ((source: GraphSignal) => void)[]> = {}
let observersToAddLazy: Record<number, ((source: GraphOwner) => void)[]> = {}

export function updateSignal(rootId: number, id: number, newValue: unknown): void {
  const node = NodeMap[rootId].signals[id]
  if (node) {
    node.setValue(newValue)
    node.setUpdate(true)
    signalsUpdated.add(id)
  }
}

export function updateComputation(rootId: number, id: number): void {
  const owner = NodeMap[rootId].owners[id]
  if (owner) {
    owner.setUpdate(true)
    ownersUpdated.add(id)
  }
}

// reset all of the computationRerun state
export function resetComputationRerun() {
  for (const { owners, signals } of Object.values(NodeMap)) {
    for (const id of ownersUpdated) owners[id].setUpdate(false)
    for (const id of signalsUpdated) signals[id].setUpdate(false)
  }
}

export function disposeAllNodes() {
  for (const { owners, signals } of Object.values(NodeMap)) {
    disposeAll(Object.values(owners))
    disposeAll(Object.values(signals))
  }
}

export function removeRootFromMap(id: number) {
  delete NodeMap[id]
}

export function afterGraphUpdate() {
  // sources and observers can be added lazily only during one reconciliation
  sourcesToAddLazy = {}
  observersToAddLazy = {}
  signalsUpdated.clear()
  ownersUpdated.clear()
}

export function findOwnerRootId(owner: GraphOwner): number {
  for (const rootId in NodeMap) {
    const owners = NodeMap[rootId].owners
    for (const id in owners) {
      if (id === owner.id + "") return +rootId
    }
  }
  throw "ROOT_ID_NOT_FOUND"
}

const addSignalToMap = (rootId: number, node: GraphSignal) => {
  const id = node.id
  const signals = NodeMap[rootId].signals
  signals[id] = node
  onCleanup(deleteKey.bind(signals, id))
  const toAdd = sourcesToAddLazy[id]
  if (toAdd) {
    toAdd.forEach(f => f(node))
    delete sourcesToAddLazy[id]
  }
}
const addOwnerToMap = (rootId: number, node: GraphOwner) => {
  const id = node.id
  const owners = NodeMap[rootId].owners
  owners[id] = node
  onCleanup(deleteKey.bind(owners, id))
  const toAdd = observersToAddLazy[id]
  if (toAdd) {
    toAdd.forEach(f => f(node))
    delete observersToAddLazy[id]
  }
}

function mapObserver(rootId: number, id: number, mutable: GraphOwner[]) {
  const node = NodeMap[rootId].owners[id]
  if (node) mutable.push(node)
  else pushToArrayProp(observersToAddLazy, id, owner => mutable.push(owner))
}

function mapSource(rootId: number, id: number, mutable: GraphSignal[]) {
  const node = NodeMap[rootId].signals[id]
  if (node) mutable.push(node)
  else pushToArrayProp(sourcesToAddLazy, id, signal => mutable.push(signal))
}

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
export function mapNewOwner(rootId: number, owner: Readonly<MappedOwner>): GraphOwner {
  // wrap with root that will be disposed together with the rest of the tree
  return createRoot(dispose => {
    const [updated, setUpdate] = createSignal(false)

    const { id } = owner
    const sources: GraphSignal[] = []
    const signals: GraphSignal[] = []
    const children: GraphOwner[] = []
    const node: GraphOwner = {
      id,
      name: owner.name,
      type: owner.type,
      sources,
      children,
      dispose,
      get updated() {
        return updated()
      },
      setUpdate,
    }
    addOwnerToMap(rootId, node)
    owner.sources.forEach(sourceId => mapSource(rootId, sourceId, sources))

    // TODO: remove mapping signals
    // node.signals.push(...owner.signals.map(createSignalNode))
    node.children.push(...owner.children.map(child => mapNewOwner(rootId, child)))
    // if (owner.signal) node.signal = createSignalNode(rootId, owner.signal)

    onCleanup(disposeAll.bind(void 0, node.children))
    // onCleanup(disposeAll.bind(void 0, node.signals))

    return node
  })
}

export function mapNewRoot(rootId: number, owner: Readonly<MappedOwner>): GraphOwner {
  NodeMap[rootId] = {
    owners: {},
    signals: {},
  }
  return mapNewOwner(rootId, owner)
}

/**
 * Sync "createSignalNode" is meant to be used when creating new owner node,
 * when there is a reactive root that will take care of cleaning up the value signal
 */
function createSignalNode(rootId: number, raw: Readonly<MappedSignal>): GraphSignal {
  if (!getOwner()) throw "This should be executed under a root"
  const [value, setValue] = createSignal(raw.value)
  const [updated, setUpdate] = createSignal(false)
  const observers: GraphOwner[] = []
  const { id } = raw
  const node: GraphSignal = {
    id,
    name: raw.name,
    observers,
    get value() {
      return value()
    },
    get updated() {
      return updated()
    },
    setValue,
    setUpdate,
  }
  addSignalToMap(rootId, node)
  raw.observers.forEach(observerId => mapObserver(rootId, observerId, observers))

  return node
}

/**
 * Async "createSignalNode" is meant to be used when reconciling the tree,
 * when there is no reactive root to take care of cleaning up the value signal
 */
function createSignalNodeAsync(rootId: number, raw: Readonly<MappedSignal>): GraphSignal {
  return createRoot(dispose => Object.assign(createSignalNode(rootId, raw), { dispose }))
}

/**
 * reconciles the existing reactive owner tree,
 * looking for changes and applying them granularely.
 */
function reconcileChildren(
  rootId: number,
  newChildren: MappedOwner[],
  children: GraphOwner[],
): void {
  const length = children.length,
    newLength = newChildren.length,
    childrenExtended = newLength > length

  let i = 0,
    limit = childrenExtended ? length : newLength,
    node: GraphOwner,
    mapped: MappedOwner

  for (; i < limit; i++) {
    node = children[i]
    mapped = newChildren[i]
    if (node.id === mapped.id) reconcileNode(rootId, mapped, node)
    else {
      // dispose old, map new child
      node.dispose()
      children[i] = mapNewOwner(rootId, mapped)
    }
  }

  if (childrenExtended) {
    for (; i < newLength; i++) {
      // dispose old, map new child
      children[i]?.dispose()
      children[i] = mapNewOwner(rootId, newChildren[i])
    }
  } else {
    // dispose old
    disposeAll(children.splice(i))
  }
}

// function reconcileSignals(newSignals: readonly MappedSignal[], signals: GraphSignal[]): void {
//   if (!newSignals.length && !signals.length) return
//   const removed: number[] = []
//   const intersection: MappedSignal[] = []
//   for (const signal of signals) {
//     const newSignal = newSignals.find(compareId.bind(signal))
//     if (newSignal) {
//       // reconcile signal observers
//       reconcileArrayByIds(newSignal.observers, signal.observers, mapObserver)
//       intersection.push(newSignal)
//     } else removed.push(signal.id)
//   }
//   // remove
//   if (removed.length) mutateFilter(signals, o => !removed.includes(o.id))
//   // map new signals
//   for (const raw of newSignals) {
//     if (!intersection.includes(raw)) signals.push(createSignalNodeAsync(raw))
//   }
// }

export function reconcileNode(rootId: number, mapped: MappedOwner, node: GraphOwner): void {
  reconcileChildren(rootId, mapped.children, node.children)
  // TODO: remove mapping signals
  // reconcileSignals(mapped.signals, node.signals)
  reconcileArrayByIds(mapped.sources, node.sources, mapSource.bind(void 0, rootId))

  // reconcile signal observers
  // if (mapped.signal) {
  //   if (!node.signal) node.signal = createSignalNodeAsync(rootId, mapped.signal)
  //   else
  //     reconcileArrayByIds(
  //       mapped.signal.observers,
  //       node.signal.observers,
  //       mapObserver.bind(void 0, rootId),
  //     )
  // }
}
