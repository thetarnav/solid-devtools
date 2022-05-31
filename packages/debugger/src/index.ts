import { FlowComponent, createEffect, onCleanup, createRoot, createSignal } from "solid-js"
import { isProd } from "@solid-primitives/utils"
import {
	postWindowMessage,
	MESSAGE,
	onWindowMessage,
	startListeningWindowMessages,
} from "@shared/messanger"
import { getOwner } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createGraphRoot } from "./primitives"
import { useLocator } from "@solid-devtools/locator"

console.log("debugger script working")

startListeningWindowMessages()

export const Debugger: FlowComponent = props => {
	// run the debugger only on client in development env
	if (isProd) return props.children

	const root = getOwner()!
	const [enabled, setEnabled] = createSignal(false)

	let dispose: VoidFunction | undefined
	let _forceUpdate: VoidFunction | undefined
	onCleanup(() => dispose?.())

	postWindowMessage(MESSAGE.SolidOnPage)

	// update the graph only if the devtools panel is in view
	onCleanup(onWindowMessage(MESSAGE.PanelVisibility, setEnabled))
	onCleanup(onWindowMessage(MESSAGE.ForceUpdate, () => _forceUpdate?.()))

	setTimeout(() => {
		// create the graph in a separate root, so that it doesn't walk and track itself
		createRoot(_dispose => {
			dispose = _dispose
			const [tree, { forceUpdate }] = createGraphRoot(root, { enabled })
			_forceUpdate = forceUpdate
			createEffect(() => postWindowMessage(MESSAGE.GraphUpdate, tree))
		})
	})

	useLocator({ components: () => [] })

	makeBatchUpdateListener(updates => postWindowMessage(MESSAGE.BatchedUpdate, updates))

	return props.children
}
