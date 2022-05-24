/* @refresh reload */

import { batch, createRoot, createSignal, getOwner, onCleanup, Setter } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { UpdateType, MESSAGE } from "@shared/messanger"
import { pushToArrayProp } from "@shared/utils"
import { MappedOwner, MappedSignal, GraphOwner, GraphSignal, GraphRoot } from "@shared/graph"
import { onRuntimeMessage } from "./messanger"

const dispose = (o: { dispose?: VoidFunction }) => o.dispose?.()
const disposeAll = (list: { dispose?: VoidFunction }[]) => list.forEach(dispose)

// Maps <ID -- updated signal setter> for triggering "updated" state of computations & signals
const computationRerunMap: Record<number, Setter<boolean>> = {}
const signalUpdateMap: Record<number, { update: Setter<boolean>; value: Setter<unknown> }> = {}

// TODO: removing disposed nodes from maps
const ownersMap: Record<number, GraphOwner> = {}
const signalsMap: Record<number, GraphSignal> = {}

// TODO: clear these after each tree reconciliation
// TODO: map source/observers length separately, as these won't always resolve
let currentSourcesToAdd: Record<number, ((source: GraphSignal) => void)[]>
let currentObserversToAdd: Record<number, ((source: GraphOwner) => void)[]>

const addSignalToMap = (node: GraphSignal) => {
	const id = node.id
	signalsMap[id] = node
	const toAdd = currentSourcesToAdd[id]
	if (toAdd) {
		toAdd.forEach(f => f(node))
		delete currentSourcesToAdd[id]
	}
}
const addOwnerToMap = (node: GraphOwner) => {
	const id = node.id
	ownersMap[id] = node
	const toAdd = currentObserversToAdd[id]
	if (toAdd) {
		toAdd.forEach(f => f(node))
		delete currentObserversToAdd[id]
	}
}

function mapObserver(id: number, mutable: GraphOwner[]) {
	const node = ownersMap[id]
	if (node) mutable.push(node)
	else pushToArrayProp(currentObserversToAdd, id, owner => mutable.push(owner))
}

function mapSource(id: number, mutable: GraphSignal[]) {
	const node = signalsMap[id]
	if (node) mutable.push(node)
	else pushToArrayProp(currentSourcesToAdd, id, signal => mutable.push(signal))
}

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
function mapNewOwner(owner: Readonly<MappedOwner>): GraphOwner {
	// wrap with root that will be disposed together with the rest of the tree
	return createRoot(dispose => {
		const [rerun, setRerun] = createSignal(false)

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
			get rerun() {
				return rerun()
			},
		}
		addOwnerToMap(node)
		owner.sources.forEach(sourceId => mapSource(sourceId, sources))

		node.signals.push(...owner.signals.map(createSignalNode))
		node.children.push(...owner.children.map(mapNewOwner))
		if (owner.value) node.signal = createSignalNode(owner.value)

		computationRerunMap[id] = setRerun
		onCleanup(() => delete computationRerunMap[id])
		onCleanup(disposeAll.bind(void 0, node.children))
		onCleanup(() => {
			for (const signal of node.signals) {
				signal.dispose?.()
				delete signalUpdateMap[signal.id]
			}
		})

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
	const [updated, setUpdated] = createSignal(false)
	signalUpdateMap[raw.id] = { value: setValue, update: setUpdated }
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
	return createRoot(dispose => {
		return {
			...createSignalNode(raw),
			dispose,
		}
	})
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
		if (node.id === mapped.id) {
			// reconcile child
			reconcileChildren(mapped.children, node.children)
			reconcileSignals(mapped.signals, node.signals)

			// TODO: reconcile observers of the node.signal

			// reconcile sources
			// cannot rely on index for indenfifying removed/added like with children/signals
			// sources are highly dynamic — can be removed and added again
			const { sources } = node
			const ids = new Set(mapped.sources)
			const toRemove: GraphSignal[] = []
			let id: number
			for (const signal of sources) {
				// remove removed sources
				id = signal.id
				if (ids.has(id)) ids.delete(id)
				else toRemove.push(signal)
			}
			node.sources = sources.filter(s => !toRemove.includes(s))
			// add new sources
			for (id of ids) mapSource(id, sources)
		} else {
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

function reconcileSignals(newSignals: MappedSignal[], signals: GraphSignal[]): void {
	const length = signals.length,
		newLength = newSignals.length

	// TODO: reconcile observers

	for (let i = length; i < newLength; i++) {
		signals[i] = createSignalNodeAsync(newSignals[i])
	}
}

const exports = createRoot(() => {
	const [graphs, setGraphs] = createStore<GraphRoot[]>([])

	onRuntimeMessage(MESSAGE.GraphUpdate, root => {
		// reset all of the computationRerun state
		batch(() => {
			for (const id in computationRerunMap) computationRerunMap[id](false)
			for (const id in signalUpdateMap) signalUpdateMap[id].update(false)
		})

		const index = graphs.findIndex(i => i.id === root.id)
		// reconcile existing root
		if (index !== -1) {
			setGraphs(
				index,
				"children",
				produce(children => reconcileChildren(root.children, children)),
			)
		}
		// insert new root
		else {
			setGraphs(graphs.length, {
				id: root.id,
				children: root.children.map(mapNewOwner),
			})
		}
	})

	onRuntimeMessage(MESSAGE.ResetPanel, () => setGraphs([]))

	onRuntimeMessage(MESSAGE.BatchedUpdate, updates => {
		console.group("Batched Updates")
		batch(() => {
			for (const update of updates) {
				if (update.type === UpdateType.Signal) {
					console.log("Signal update", update.payload.id, update.payload.value)
					const signal = signalUpdateMap[update.payload.id]
					if (signal) {
						signal.value(update.payload.value)
						signal.update(true)
					}
				} else {
					console.log("Computation rerun", update.payload)
					computationRerunMap[update.payload]?.(true)
				}
			}
		})
		console.groupEnd()
	})

	return { graphs }
})
export const { graphs } = exports
