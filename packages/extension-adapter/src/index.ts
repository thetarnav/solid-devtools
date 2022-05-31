import { Accessor, createEffect, createSignal, onCleanup } from "solid-js"
import {
	MESSAGE,
	onWindowMessage,
	postWindowMessage,
	startListeningWindowMessages,
} from "@shared/messanger"
import { MappedRoot } from "@shared/graph"
import { BatchUpdateListener } from "@debugger"

console.log("debugger script working")

startListeningWindowMessages()

export function useExtensionAdapter({
	forceUpdate,
	tree,
	makeBatchUpdateListener,
}: {
	forceUpdate: VoidFunction
	update: VoidFunction
	makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
	tree: MappedRoot
}): { enabled: Accessor<boolean> } {
	const [enabled, setEnabled] = createSignal(false)

	postWindowMessage(MESSAGE.SolidOnPage)

	// update the graph only if the devtools panel is in view
	onCleanup(onWindowMessage(MESSAGE.PanelVisibility, setEnabled))
	onCleanup(onWindowMessage(MESSAGE.ForceUpdate, forceUpdate))

	createEffect(() => postWindowMessage(MESSAGE.GraphUpdate, tree))

	makeBatchUpdateListener(updates => postWindowMessage(MESSAGE.BatchedUpdate, updates))

	return { enabled }
}
