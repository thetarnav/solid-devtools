import { batch, createRoot, createSignal, onCleanup, Setter } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { MESSAGE } from "@shared/messanger"
import { onRuntimeMessage } from "./messanger"
import { MappedOwner, ReactiveGraphOwner, ReactiveGraphRoot } from "@shared/graph"

const dispose = (o: ReactiveGraphOwner) => o.dispose()
const disposeAll = (list: ReactiveGraphOwner[]) => list.forEach(dispose)

const computationRerun: Record<number, Setter<boolean>> = {}

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
function mapNewOwner(owner: MappedOwner): ReactiveGraphOwner {
	// wrap with root that will be disposed together with the rest of the tree
	return createRoot(dispose => {
		const [rerun, setRerun] = createSignal(false)
		const { id } = owner
		const node: ReactiveGraphOwner = {
			...owner,
			dispose,
			get rerun() {
				return rerun()
			},
			children: owner.children.map(mapNewOwner),
		}
		computationRerun[id] = setRerun
		onCleanup(() => delete computationRerun[id])
		onCleanup(disposeAll.bind(void 0, node.children))
		return node
	})
}

/**
 * reconciles the existing reactive owner tree,
 * looking for changes and applying them granularely.
 */
function reconcileChildren(newChildren: MappedOwner[], children: ReactiveGraphOwner[]): void {
	const length = children.length,
		newLength = newChildren.length,
		childrenExtended = newLength > length

	let i = 0,
		limit = childrenExtended ? length : newLength,
		branch: ReactiveGraphOwner,
		owner: MappedOwner

	for (; i < limit; i++) {
		branch = children[i]
		owner = newChildren[i]
		if (branch.id === owner.id) reconcileChildren(owner.children, branch.children)
		else {
			branch.dispose()
			children[i] = mapNewOwner(owner)
			break
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

const exports = createRoot(() => {
	const [graphs, setGraphs] = createStore<ReactiveGraphRoot[]>([])

	onRuntimeMessage(MESSAGE.GraphUpdate, root => {
		// reset all of the computationRerun state
		batch(() => {
			for (const id in computationRerun) computationRerun[id](false)
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

	const handleComputationRerun = (id: number) => {
		// ? should the children of owner that rerun be removed?
		computationRerun[id]?.(true)
	}
	onRuntimeMessage(MESSAGE.ComputationRun, handleComputationRerun)
	onRuntimeMessage(MESSAGE.SignalUpdate, ({ id, value }) => {
		console.log("Signal updated", id, value)
	})

	return { graphs }
})
export const { graphs } = exports
