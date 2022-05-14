import { createEffect, createRoot, createSignal } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { MESSAGE } from "@shared/messanger"
import { onRuntimeMessage } from "./messanger"
import { GraphRoot, MappedOwner } from "@shared/graph"

const exports = createRoot(() => {
	const [graphs, setGraphs] = createStore<GraphRoot[]>([])

	onRuntimeMessage(MESSAGE.GraphUpdate, root => {
		const index = graphs.findIndex(i => i.id === root.id)
		if (index !== -1) setGraphs(index, reconcile(root))
		else setGraphs(graphs.length, root)
	})

	onRuntimeMessage(MESSAGE.ResetPanel, () => setGraphs([]))

	onRuntimeMessage(MESSAGE.ComputationRun, id => {
		console.log(`Owner ${id} rerun`)
	})

	return { graphs }
})
export const { graphs } = exports
