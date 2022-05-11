import { createEffect, createRoot, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { MESSAGE } from "@shared/messanger"
import { onRuntimeMessage } from "./messanger"
import { MappedOwner } from "@shared/graph"

const exports = createRoot(() => {
	const [graphs, setGraphs] = createStore<{ graphs: MappedOwner[] }>({ graphs: [] })

	onRuntimeMessage(MESSAGE.SolidUpdate, tree => {
		createRoot(() => {
			setGraphs("graphs", p => [...p, ...tree])
		})
	})

	onRuntimeMessage(MESSAGE.ResetPanel, () => setGraphs("graphs", []))

	return { graphs }
})
export const { graphs } = exports
