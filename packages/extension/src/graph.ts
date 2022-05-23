/* @refresh reload */

import { batch, createRoot, createSignal, getOwner, onCleanup, Setter } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { UpdateType, MESSAGE } from "@shared/messanger"
import { onRuntimeMessage } from "./messanger"
import { MappedOwner, MappedSignal, GraphOwner, GraphSignal, GraphRoot } from "@shared/graph"

const dispose = (o: { dispose?: VoidFunction }) => o.dispose?.()
const disposeAll = (list: { dispose?: VoidFunction }[]) => list.forEach(dispose)

const computationRerunMap: Record<number, Setter<boolean>> = {}
const signalUpdateMap: Record<number, { update: Setter<boolean>; value: Setter<unknown> }> = {}

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
function mapNewOwner(owner: Readonly<MappedOwner>): GraphOwner {
	// wrap with root that will be disposed together with the rest of the tree
	return createRoot(dispose => {
		const [rerun, setRerun] = createSignal(false)

		const { id } = owner
		const node: GraphOwner = {
			id,
			name: owner.name,
			type: owner.type,
			dispose,
			get rerun() {
				return rerun()
			},
			signals: owner.signals.map(createSignalNode),
			children: owner.children.map(mapNewOwner),
			...(owner.value ? { signal: createSignalNode(owner.value) } : null),
		}

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
	return {
		id: raw.id,
		name: raw.name,
		get value() {
			return value()
		},
		get updated() {
			return updated()
		},
	}
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
		branch: GraphOwner,
		owner: MappedOwner

	for (; i < limit; i++) {
		branch = children[i]
		owner = newChildren[i]
		if (branch.id === owner.id) {
			reconcileChildren(owner.children, branch.children)
			reconcileSignals(owner.signals, branch.signals)
		} else {
			branch.dispose()
			children[i] = mapNewOwner(owner)
		}
	}

	if (childrenExtended) {
		for (; i < newLength; i++) {
			children[i]?.dispose()
			children[i] = mapNewOwner(newChildren[i])
		}
	} else {
		disposeAll(children.splice(i))
	}
}

function reconcileSignals(newSignals: MappedSignal[], signals: GraphSignal[]): void {
	const length = signals.length,
		newLength = newSignals.length

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
