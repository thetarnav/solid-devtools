import { FlowComponent, createEffect, onCleanup, createRoot } from "solid-js"
import { isProd } from "@solid-primitives/utils"
import {
	postWindowMessage,
	MESSAGE,
	onWindowMessage,
	startListeningWindowMessages,
	once,
} from "@shared/messanger"
import { getOwner } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createGraphRoot } from "./primitives"

console.log("debugger script working")

startListeningWindowMessages()

export const Debugger: FlowComponent = props => {
	// run the debugger only on client in development env
	if (isProd) return props.children

	postWindowMessage(MESSAGE.SolidOnPage)
	// make sure the devtools script will be triggered to create devtools panel
	onCleanup(
		once(onWindowMessage, MESSAGE.DevtoolsScriptConnected, () =>
			postWindowMessage(MESSAGE.SolidOnPage),
		),
	)

	const root = getOwner()!
	let dispose: VoidFunction | undefined
	onCleanup(() => dispose?.())

	setTimeout(() => {
		// create the graph in a separate root, so that it doesn't walk and track itself
		dispose = createRoot(dispose => {
			const [tree, { forceUpdate }] = createGraphRoot(root)
			createEffect(() => postWindowMessage(MESSAGE.GraphUpdate, tree))

			// force update the graph when user opens the devtools panel
			onCleanup(onWindowMessage(MESSAGE.PanelVisibility, visible => visible && forceUpdate()))

			makeBatchUpdateListener(updates => postWindowMessage(MESSAGE.BatchedUpdate, updates))
			return dispose
		})
	})

	return props.children
}
