import { Accessor, batch, createRoot, createSignal, onCleanup, Setter } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { createBranch } from "@solid-primitives/rootless"
import { MESSAGE } from "@shared/messanger"
import { onRuntimeMessage } from "./messanger"
import { MappedOwner, ReactiveGraphOwner, ReactiveGraphRoot } from "@shared/graph"

// ? is "get" necessery?
const computationRerun: Record<number, { get: Accessor<boolean>; set: Setter<boolean> }> = {}

/**
 * maps the raw owner tree to be placed into the reactive graph store
 * this is for new branches – owners that just have been created
 */
function mapNewOwner(owner: MappedOwner): ReactiveGraphOwner {
	// branch will be disposed with it's parent or with dispose()
	return createBranch(dispose => {
		const [rerun, setRerun] = createSignal(false)
		const { id } = owner
		computationRerun[id] = {
			get: rerun,
			set: setRerun,
		}
		onCleanup(() => delete computationRerun[id])
		return {
			...owner,
			dispose,
			get rerun() {
				return rerun()
			},
			children: owner.children.map(mapNewOwner),
		}
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
		children.splice(i).forEach(o => o.dispose())
	}
}

const exports = createRoot(() => {
	const [graphs, setGraphs] = createStore<ReactiveGraphRoot[]>([])

	onRuntimeMessage(MESSAGE.GraphUpdate, root => {
		// reset all of the computationRerun state
		batch(() => {
			for (const id in computationRerun) {
				computationRerun[id].set(false)
			}
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
		computationRerun[id]?.set(true)
	}
	onRuntimeMessage(MESSAGE.ComputationRun, handleComputationRerun)

	return { graphs }
})
export const { graphs } = exports
