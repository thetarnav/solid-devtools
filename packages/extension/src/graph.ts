import { batch, createRoot, createSelector, createSignal, getOwner, onCleanup } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { HighlightContextState } from "@solid-devtools/ui"
import { UpdateType } from "@shared/bridge"
import { mutateFilter, pushToArrayProp } from "@shared/utils"
import {
  MappedOwner,
  MappedSignal,
  GraphOwner,
  GraphSignal,
  GraphRoot,
  SerialisedTreeRoot,
} from "@shared/graph"
import { onRuntimeMessage } from "./messanger"

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

const ownersMap: Record<number, GraphOwner> = {}
const signalsMap: Record<number, GraphSignal> = {}

// TODO: map source/observers length separately, as these won't always resolve
let sourcesToAddLazy: Record<number, ((source: GraphSignal) => void)[]> = {}
let observersToAddLazy: Record<number, ((source: GraphOwner) => void)[]> = {}

function afterGraphUpdate() {
  // sources and observers can be added lazily only during one reconciliation
  sourcesToAddLazy = {}
  observersToAddLazy = {}
  signalsUpdated.clear()
  ownersUpdated.clear()
}

const addSignalToMap = (node: GraphSignal) => {
  const id = node.id
  signalsMap[id] = node
  onCleanup(deleteKey.bind(signalsMap, id))
  const toAdd = sourcesToAddLazy[id]
  if (toAdd) {
    toAdd.forEach(f => f(node))
    delete sourcesToAddLazy[id]
  }
}
const addOwnerToMap = (node: GraphOwner) => {
  const id = node.id
  ownersMap[id] = node
  onCleanup(deleteKey.bind(ownersMap, id))
  const toAdd = observersToAddLazy[id]
  if (toAdd) {
    toAdd.forEach(f => f(node))
    delete observersToAddLazy[id]
  }
}

function mapObserver(id: number, mutable: GraphOwner[]) {
  const node = ownersMap[id]
  if (node) mutable.push(node)
  else pushToArrayProp(observersToAddLazy, id, owner => mutable.push(owner))
}

function mapSource(id: number, mutable: GraphSignal[]) {
  const node = signalsMap[id]
  if (node) mutable.push(node)
  else pushToArrayProp(sourcesToAddLazy, id, signal => mutable.push(signal))
}

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
function mapNewOwner(owner: Readonly<MappedOwner>): GraphOwner {
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
      signals,
      children,
      dispose,
      get updated() {
        return updated()
      },
      setUpdate,
    }
    addOwnerToMap(node)
    owner.sources.forEach(sourceId => mapSource(sourceId, sources))

    node.signals.push(...owner.signals.map(createSignalNode))
    node.children.push(...owner.children.map(mapNewOwner))
    if (owner.signal) node.signal = createSignalNode(owner.signal)

    onCleanup(disposeAll.bind(void 0, node.children))
    onCleanup(disposeAll.bind(void 0, node.signals))

    return node
  })
}

/**
 * Sync "createSignalNode" is meant to be used when creating new owner node,
 * when there is a reactive root that will take care of cleaning up the value signal
 */
function createSignalNode(raw: Readonly<MappedSignal>): GraphSignal {
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
  addSignalToMap(node)
  raw.observers.forEach(observerId => mapObserver(observerId, observers))

  return node
}

/**
 * Async "createSignalNode" is meant to be used when reconciling the tree,
 * when there is no reactive root to take care of cleaning up the value signal
 */
function createSignalNodeAsync(raw: Readonly<MappedSignal>): GraphSignal {
  return createRoot(dispose => Object.assign(createSignalNode(raw), { dispose }))
}

/**
 * reconciles the existing reactive owner tree,
 * looking for changes and applying them granularely.
 */
function reconcileChildren(newChildren: MappedOwner[], children: GraphOwner[]): void {
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
    if (node.id === mapped.id) reconcileNode(mapped, node)
    else {
      // dispose old, map new child
      node.dispose()
      children[i] = mapNewOwner(mapped)
    }
  }

  if (childrenExtended) {
    for (; i < newLength; i++) {
      // dispose old, map new child
      children[i]?.dispose()
      children[i] = mapNewOwner(newChildren[i])
    }
  } else {
    // dispose old
    disposeAll(children.splice(i))
  }
}

function reconcileSignals(newSignals: readonly MappedSignal[], signals: GraphSignal[]): void {
  if (!newSignals.length && !signals.length) return
  const removed: number[] = []
  const intersection: MappedSignal[] = []
  for (const signal of signals) {
    const newSignal = newSignals.find(compareId.bind(signal))
    if (newSignal) {
      // reconcile signal observers
      reconcileArrayByIds(newSignal.observers, signal.observers, mapObserver)
      intersection.push(newSignal)
    } else removed.push(signal.id)
  }
  // remove
  if (removed.length) mutateFilter(signals, o => !removed.includes(o.id))
  // map new signals
  for (const raw of newSignals) {
    if (!intersection.includes(raw)) signals.push(createSignalNodeAsync(raw))
  }
}

function reconcileNode(mapped: MappedOwner, node: GraphOwner): void {
  reconcileChildren(mapped.children, node.children)
  reconcileSignals(mapped.signals, node.signals)
  reconcileArrayByIds(mapped.sources, node.sources, mapSource)

  // reconcile signal observers
  if (mapped.signal) {
    if (!node.signal) node.signal = createSignalNodeAsync(mapped.signal)
    else reconcileArrayByIds(mapped.signal.observers, node.signal.observers, mapObserver)
  }
}

const exports = createRoot(() => {
  const [graphs, setGraphs] = createStore<GraphRoot[]>([])

  let lastHoveredNode: null | GraphOwner | GraphSignal = null
  const [highlightedObservers, setHighlightedObservers] = createSignal<GraphOwner[]>([])
  const [highlightedSources, setHighlightedSources] = createSignal<GraphSignal[]>([])

  const highlights: HighlightContextState = {
    highlightSignalObservers(signal, highlight) {
      if (highlight) {
        setHighlightedObservers(signal.observers)
        lastHoveredNode = signal
      } else if (lastHoveredNode === signal) {
        setHighlightedObservers([])
      }
    },
    highlightNodeSources(owner, highlight) {
      if (highlight) {
        setHighlightedSources(owner.sources)
        lastHoveredNode = owner
      } else if (lastHoveredNode === owner) {
        setHighlightedSources([])
      }
    },
    isObserverHighlighted: createSelector(highlightedObservers, (owner: GraphOwner, list) =>
      list.includes(owner),
    ),
    isSourceHighlighted: createSelector(highlightedSources, (signal: GraphSignal, list) =>
      list.includes(signal),
    ),
  }

  const addNewRoot = (proxy: GraphRoot[], { id, tree }: SerialisedTreeRoot): void => {
    proxy.push({ id, tree: mapNewOwner(tree) })
  }
  const removeRoot = (proxy: GraphRoot[], id: number): void => {
    proxy.splice(
      proxy.findIndex(e => e.id === id),
      1,
    )
  }
  const updateRoot = (proxy: GraphRoot[], { id, tree }: SerialisedTreeRoot): void => {
    const index = graphs.findIndex(r => r.id === id)
    // reconcile existing root
    if (index !== -1) reconcileNode(tree, proxy[index].tree)
    // insert new root
    else addNewRoot(proxy, { id, tree })
  }

  onRuntimeMessage("GraphUpdate", ({ added, removed, updated }) => {
    batch(() => {
      // reset all of the computationRerun state
      for (const id of ownersUpdated) ownersMap[id].setUpdate(false)
      for (const id of signalsUpdated) signalsMap[id].setUpdate(false)

      setGraphs(
        produce(proxy => {
          removed.forEach(id => removeRoot(proxy, id))
          added.forEach(root => addNewRoot(proxy, root))
          updated.forEach(root => updateRoot(proxy, root))
        }),
      )
    })

    afterGraphUpdate()
  })

  onRuntimeMessage("ResetPanel", () => {
    setGraphs([])
    disposeAll(Object.values(ownersMap))
    disposeAll(Object.values(signalsMap))
    afterGraphUpdate()
  })

  onRuntimeMessage("BatchedUpdate", updates => {
    console.groupCollapsed("Batched Updates")
    batch(() => {
      for (const update of updates) {
        if (update.type === UpdateType.Signal) {
          const signal = signalsMap[update.payload.id]
          console.log("Signal update", update.payload.id, update.payload.value, "in map:", !!signal)
          if (signal) {
            signal.setValue(update.payload.value)
            signal.setUpdate(true)
            signalsUpdated.add(update.payload.id)
          }
        } else {
          const owner = ownersMap[update.payload]
          console.log("Computation rerun", update.payload, "in map:", !!owner)
          if (owner) {
            owner.setUpdate(true)
            ownersUpdated.add(update.payload)
          }
        }
      }
    })
    console.groupEnd()
  })

  return {
    graphs,
    highlights,
  }
})
export const { graphs, highlights } = exports
