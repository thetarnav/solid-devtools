import { createEffect, createRoot, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { MESSAGE } from "@shared/messanger"
import { onRuntimeMessage } from "./messanger"
import { GraphRoot, MappedOwner } from "@shared/graph"

const clear = <T>(p: T): void => {
	for (const key in p) {
		if (Object.prototype.hasOwnProperty.call(p, key)) {
			delete p[key]
		}
	}
}

const exports = createRoot(() => {
	const [graphs, setGraphs] = createStore<GraphRoot[]>([])

	onRuntimeMessage(MESSAGE.SolidUpdate, root => {
		setGraphs(i => i.id === root.id, root)
	})

	onRuntimeMessage(MESSAGE.ResetPanel, () => setGraphs([]))

	return { graphs }
})
export const { graphs } = exports
